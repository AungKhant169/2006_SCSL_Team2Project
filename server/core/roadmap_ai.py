import json

from fastapi import status
from openai import APITimeoutError, OpenAI, OpenAIError

from core.benchmarks import Measure
from core.exceptions import BaseError
from core.geolocation import validate_postal
from core.rate_limit import RateLimitError, ai_limiter
from core.roadmap_pool import candidate_pool
from core.settings import settings
from models.roadmap import PLAN_LENGTH
from models.school_record import SchoolInfo
from models.user import User
from schemas.roadmap import CreateRoadmapRequest

# The client gives up after 15 seconds (PERF-7), so stop slightly earlier than that.
AI_TIMEOUT_SECONDS = 14

# Strict JSON schema: the model must answer with {"choices": [<school id>, ...]}.
RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "roadmap_choices",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {"choices": {"type": "array", "items": {"type": "integer"}}},
            "required": ["choices"],
            "additionalProperties": False,
        },
    },
}

# How the student's score relates to the data available at each stage.
STAGE_NOTES = {
    "primary": (
        "No academic score applies to P1 registration, and no entry benchmark is "
        "available."
    ),
    "secondary": (
        "The score is the student's PSLE AL aggregate (4 best, 32 worst, lower is better). "
        "psle_2017_cutoff is the 2017 PSLE T-score cut-off of the last student posted, "
        "which is on a different scale (higher is more selective). Compare them by "
        "position: AL 4 matches the highest cut-off among the candidates and AL 32 the "
        "lowest. The cut-off is only indicative. Schools without a cut-off are unknown "
        "quantities. Where entry_figures has PSLE_AL, it is the AL range of the students "
        "posted to the school in a year (low is the best, high the cut-off)."
    ),
    "postsec": (
        "The scores are O-Level aggregates (lower is better): L1R5 is for junior colleges "
        "and Millennia Institute, ELR2B2 for polytechnics and ITE. entry_figures lists the "
        "latest JAE cut-off of a school by measure: a student whose aggregate is at most "
        "high has been admitted before. Schools without entry_figures are unknown "
        "quantities. Junior colleges and polytechnics suit different students."
    ),
    "uni": (
        "The score is the student's polytechnic GPA (0 to 4, higher is better). Where "
        "entry_figures has GPA, low and high are the 10th and 90th percentile GPA of the "
        "students admitted. Schools without entry_figures are unknown quantities."
    ),
}

# Stage-specific selection criteria. Distance only matters at some stages, so the
# distance instruction is only added where it applies.
STAGE_CRITERIA = {
    "primary": [
        (
            "Distance matters a lot: choose schools close to the student's home. Estimate "
            "nearness from the postal codes and zones (the first two digits of a "
            "Singapore postal code identify the postal sector). The estimate can be rough."
        ),
        "Where possible, vary the choices by programme (for example gifted education).",
    ],
    "secondary": [
        (
            "Rank realistic fits first: schools whose psle_2017_cutoff the student's score "
            "reaches. Where possible include one slightly ambitious, one realistic and one "
            "safer choice."
        ),
        (
            "Between schools that fit equally well, prefer the one nearer to the student's "
            "home. Estimate nearness from the postal codes and zones; the "
            "estimate can be rough."
        ),
    ],
    "postsec": [
        (
            "Rank realistic fits first: schools whose latest cut-off in entry_figures the "
            "student's aggregate is within. Where possible mix junior colleges and "
            "polytechnics, and include one slightly ambitious choice."
        ),
        "Do not consider distance; choose on programmes and fit only.",
    ],
    "uni": [
        (
            "Rank realistic fits first: schools whose GPA range in entry_figures the "
            "student's GPA reaches. Otherwise use the score only as a rough guide to how "
            "selective the choices should be."
        ),
        "Do not consider distance; choose on programmes and fit only.",
    ],
}

PROMPT = """You are helping a Singapore student plan an education pathway.

Student profile:
- Target stage: {stage}
- Previous academic score: {score}
- Residential postal code: {postal}

How to read the data at this stage: {note}

Candidate schools (JSON):
{schools}

Choose up to {length} schools from the candidates and order them from best to worst fit.
Follow these criteria:
{criteria}

Respond with JSON only."""


class RoadmapAIError(BaseError):
    AI_UNAVAILABLE = (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Unable to generate AI recommendation at this time. Please try again.",
    )
    AI_TIMEOUT = (
        status.HTTP_504_GATEWAY_TIMEOUT,
        "The AI recommendation took too long to generate. Please try again.",
    )


def _describe(school: SchoolInfo) -> dict:
    """The few facts about a school that are useful to the AI.

    Every candidate is sent, so each extra field costs tokens for every school and slows the answer
    down: the address (the postal code and zone already place the school), the programme titles, the
    gender mix and the 2017 rank (the cut-off already says how selective the school is) are left out.
    """
    flags = [
        label
        for label, value in (
            ("SAP", school.sap_ind),
            ("autonomous", school.autonomous_ind),
            ("gifted education", school.gifted_ind),
            ("integrated programme", school.ip_ind),
            ("IB", school.ib),
        )
        # The IB column holds Y or N, the others Yes or No.
        if (value or "").strip().lower() in ("yes", "y")
    ]
    # The latest year of each entry figure the school has, as {measure: {year, low, high}}.
    figures = {
        measure: {"year": row.year, "low": row.low, "high": row.high}
        for measure in Measure
        if (row := school.latest_benchmark(measure))
    }
    details = {
        "id": school.id,
        "name": school.school_name,
        "level": school.mainlevel_code,
        "type": school.school_type,
        "zone": school.zone,
        "postal_code": school.postal_code,
        "psle_2017_cutoff": school.psle_2017_cutoff,
        "entry_figures": figures,
        "programmes": flags,
    }
    return {
        key: value for key, value in details.items() if value not in (None, "", [], {})
    }


class AIRoadmapGenerator:
    @classmethod
    def generate(cls, user: User, request: CreateRoadmapRequest) -> list[int]:
        """Return school ids in preference order for the requested stage."""
        if request.postal:
            validate_postal(request.postal)
        if ai_limiter.exceeded(user.id):
            raise RateLimitError.AI_RATE_LIMITED()
        if not (pool := candidate_pool(request.stage)):
            return []

        # The username is deliberately not sent to the AI, only the postal code and score.
        # Every request goes out under our API key, so the provider cannot identify a specific user.
        prompt = cls._build_prompt(request, list(pool.values()))

        # An empty key (docker compose passes one through) would only earn a 401 from OpenAI.
        if not settings.openai_api_key:
            raise RoadmapAIError.AI_UNAVAILABLE()

        try:
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=AI_TIMEOUT_SECONDS,
                max_retries=0,
            )
            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                response_format=RESPONSE_FORMAT,
                reasoning_effort="low",
            )
        except APITimeoutError:
            raise RoadmapAIError.AI_TIMEOUT()
        except OpenAIError:
            # Covers API errors, connection failures and a missing OPENAI_API_KEY.
            raise RoadmapAIError.AI_UNAVAILABLE()

        choices = cls._parse_choices(completion.choices[0].message.content, set(pool))

        # TESTING ONLY: show which schools were chosen. Remove when no longer needed.
        # print("AI chose:", [pool[school_id].school_name for school_id in choices])

        return choices

    @staticmethod
    def _build_prompt(request: CreateRoadmapRequest, schools: list[SchoolInfo]) -> str:
        score = AIRoadmapGenerator._score_text(request)
        criteria = [
            "Only use ids that appear in the candidate list. Never invent or repeat an id.",
            *STAGE_CRITERIA[request.stage],
            "If no score or postal code was provided, ignore the criteria that need it.",
            f"Return fewer than {PLAN_LENGTH} ids only if there are fewer candidates.",
        ]
        return PROMPT.format(
            stage=request.stage,
            score=score,
            postal=request.postal or "not provided",
            note=STAGE_NOTES[request.stage],
            schools=json.dumps([_describe(s) for s in schools], separators=(",", ":")),
            length=PLAN_LENGTH,
            criteria="\n".join(f"{n}. {text}" for n, text in enumerate(criteria, 1)),
        )

    @staticmethod
    def _score_text(request: CreateRoadmapRequest) -> str | float:
        """What the student scored. Post-secondary has two aggregates, so each is named."""
        first, second = (
            request.previous_academic_score,
            request.previous_academic_score_b,
        )
        if request.stage == "postsec":
            named = (
                f"{name} {score:g}"
                for name, score in (("L1R5", first), ("ELR2B2", second))
                if score is not None
            )
            return ", ".join(named) or "not provided"
        return "not provided" if first is None else first

    @staticmethod
    def _parse_choices(content: str | None, valid: set[int]) -> list[int]:
        """Turn the model's JSON into valid, unique school ids (at most PLAN_LENGTH)."""
        try:
            raw = json.loads(content)["choices"]
            choices = list(dict.fromkeys(i for i in raw if i in valid))[:PLAN_LENGTH]
        except (TypeError, ValueError, KeyError):
            raise RoadmapAIError.AI_UNAVAILABLE()
        if not choices:
            raise RoadmapAIError.AI_UNAVAILABLE()
        return choices
