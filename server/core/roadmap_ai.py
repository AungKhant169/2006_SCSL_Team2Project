import json
import os

from dotenv import load_dotenv
from fastapi import status
from openai import APITimeoutError, OpenAI, OpenAIError

from core.exceptions import HttpError
from core.roadmap_pool import candidate_pool
from models.roadmap import PLAN_LENGTH
from models.school_record import SchoolInfo
from models.user import User
from schemas.roadmap import CreateRoadmapRequest

load_dotenv()

# The client gives up after 5 seconds (PERF-7), so stop slightly earlier than that.
AI_TIMEOUT_SECONDS = 10

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
        "quantities."
    ),
    "postsec": (
        "The score is an O-Level aggregate (lower is better), but there are no cut-offs "
        "in the data. Junior colleges and polytechnics suit different students."
    ),
    "uni": (
        "The score is the student's polytechnic GPA (0 to 4, higher is better). There "
        "are no admission cut-offs in the data."
    ),
}

# Stage-specific selection criteria. Distance only matters at some stages, so the
# distance instruction is only added where it applies.
STAGE_CRITERIA = {
    "primary": [
        (
            "Distance matters a lot: choose schools close to the student's home. Estimate "
            "nearness from the postal codes, addresses and zones (the first two digits of a "
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
            "home. Estimate nearness from the postal codes, addresses and zones; the "
            "estimate can be rough."
        ),
    ],
    "postsec": [
        (
            "Use the score only as a rough guide to how selective the choices should be, "
            "and mix junior colleges and polytechnics where possible."
        ),
        "Do not consider distance; choose on programmes and fit only.",
    ],
    "uni": [
        "Use the score only as a rough guide to how selective the choices should be.",
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


class RoadmapAIError(HttpError):
    AI_UNAVAILABLE = (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Unable to generate AI recommendation at this time. Please try again.",
    )
    AI_TIMEOUT = (
        status.HTTP_504_GATEWAY_TIMEOUT,
        "The AI recommendation took too long to generate. Please try again.",
    )


def _describe(school: SchoolInfo) -> dict:
    """The few facts about a school that are useful to the AI."""
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
    details = {
        "id": school.id,
        "name": school.school_name,
        "level": school.mainlevel_code,
        "type": school.school_type,
        "gender_mix": school.gendermix,
        "zone": school.zone,
        "postal_code": school.postal_code,
        "address": school.address,
        "psle_2017_cutoff": school.psle_2017_cutoff,
        "rank_2017": school.rank_2017,
        "programmes": flags,
        "applied_learning": school.alp_title,
        "learning_for_life": school.llp_title,
    }
    return {key: value for key, value in details.items() if value not in (None, "", [])}


class AIRoadmapGenerator:
    @classmethod
    def generate(cls, user: User, request: CreateRoadmapRequest) -> list[int]:
        """Return school ids in preference order for the requested stage."""
        if not (pool := candidate_pool(request.stage)):
            return []

        # The username is deliberately not sent to the AI: no personal identifiers should leave the system.
        prompt = cls._build_prompt(request, list(pool.values()))

        # An empty key (docker compose passes one through) would only earn a 401 from OpenAI.
        if not os.environ.get("OPENAI_API_KEY"):
            raise RoadmapAIError.AI_UNAVAILABLE

        try:
            client = OpenAI(timeout=AI_TIMEOUT_SECONDS, max_retries=0)
            completion = client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL") or "gpt-5.5",
                messages=[{"role": "user", "content": prompt}],
                response_format=RESPONSE_FORMAT,
                reasoning_effort="low",
            )
        except APITimeoutError:
            raise RoadmapAIError.AI_TIMEOUT
        except OpenAIError:
            # Covers API errors, connection failures and a missing OPENAI_API_KEY.
            raise RoadmapAIError.AI_UNAVAILABLE

        choices = cls._parse_choices(completion.choices[0].message.content, set(pool))

        # TESTING ONLY: show which schools were chosen. Remove when no longer needed.
        # print("AI chose:", [pool[school_id].school_name for school_id in choices])

        return choices

    @staticmethod
    def _build_prompt(request: CreateRoadmapRequest, schools: list[SchoolInfo]) -> str:
        score = request.previous_academic_score
        criteria = [
            "Only use ids that appear in the candidate list. Never invent or repeat an id.",
            *STAGE_CRITERIA[request.stage],
            "If no score or postal code was provided, ignore the criteria that need it.",
            f"Return fewer than {PLAN_LENGTH} ids only if there are fewer candidates.",
        ]
        return PROMPT.format(
            stage=request.stage,
            score="not provided" if score is None else score,
            postal=request.postal or "not provided",
            note=STAGE_NOTES[request.stage],
            schools=json.dumps([_describe(s) for s in schools], indent=1),
            length=PLAN_LENGTH,
            criteria="\n".join(f"{n}. {text}" for n, text in enumerate(criteria, 1)),
        )

    @staticmethod
    def _parse_choices(content: str | None, valid: set[int]) -> list[int]:
        """Turn the model's JSON into valid, unique school ids (at most PLAN_LENGTH)."""
        try:
            raw = json.loads(content)["choices"]
            choices = list(dict.fromkeys(i for i in raw if i in valid))[:PLAN_LENGTH]
        except (TypeError, ValueError, KeyError):
            raise RoadmapAIError.AI_UNAVAILABLE
        if not choices:
            raise RoadmapAIError.AI_UNAVAILABLE
        return choices
