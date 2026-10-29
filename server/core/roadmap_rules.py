from collections.abc import Callable
from enum import IntEnum

from core.geolocation import Geolocation
from core.roadmap_pool import candidate_pool
from models.roadmap import PLAN_LENGTH
from models.school_record import SchoolInfo
from models.user import User
from schemas.roadmap import CreateRuleRoadmapRequest

# The stages with a rule-based plan.
RULE_STAGES = ("primary", "secondary", "postsec")


class Reach(IntEnum):
    """Comparison of a score to the cutoff of a school using T-score spanned over 2017 cutoff as the basis."""

    WITHIN = 0  # within reach
    UNKNOWN = 1  # missing school data
    BEYOND = 2  # out of reach


class RuleRoadmapGenerator:
    @classmethod
    def generate(cls, user: User, request: CreateRuleRoadmapRequest) -> list[int]:
        if request.stage not in RULE_STAGES:
            return []
        if not (pool := list(candidate_pool(request.stage).values())):
            return []

        origin = Geolocation.postal_location(request.postal)
        # Made from the whole pool, so a distance limit does not change what a score reaches.
        grade = cls._grade_key(pool, request) if request.sort_by == "grade" else None
        pool = cls._within(pool, origin, request.max_distance_km)
        ranked = sorted(
            pool,
            key=lambda s: (
                *(grade(s) if grade else ()),
                *cls._distance_key(s, origin),
            ),
        )

        return [school.id for school in ranked[:PLAN_LENGTH]]

    @classmethod
    def _grade_key(
        cls, pool: list[SchoolInfo], request: CreateRuleRoadmapRequest
    ) -> Callable[[SchoolInfo], tuple] | None:
        """How well a school suits the student's grades, best first. None where grades do not apply."""
        match request.stage:
            case "secondary":
                # Bounds of T-score to match AL-score.
                cutoffs = [
                    s.psle_2017_cutoff for s in pool if s.psle_2017_cutoff is not None
                ]
                bounds = (min(cutoffs), max(cutoffs)) if cutoffs else None
                # Normalize AL-score.
                score = request.previous_academic_score
                strength = (
                    None if score is None else (32 - min(max(score, 4), 32)) / (32 - 4)
                )
                return lambda s: cls._reach_key(strength, cls._scaled_score(s, bounds))
            case "postsec":
                # TODO: Add more vectors to better fit the recommendations.
                return cls._programme_key

    @classmethod
    def _within(
        cls,
        pool: list[SchoolInfo],
        origin: tuple[float, float] | None,
        limit_km: float | None,
    ) -> list[SchoolInfo]:
        """The schools no further than the limit. A school of unknown position cannot be shown to be within it."""
        if limit_km is None or origin is None:
            return pool

        return [
            school
            for school in pool
            if (distance := cls._distance_km(school, origin)) is not None
            and distance <= limit_km
        ]

    @staticmethod
    def _distance_km(
        school: SchoolInfo, origin: tuple[float, float] | None
    ) -> float | None:
        if origin is None or school.latitude is None or school.longitude is None:
            return None

        return Geolocation.haversine_km(*origin, school.latitude, school.longitude)

    @classmethod
    def _distance_key(
        cls, school: SchoolInfo, origin: tuple[float, float] | None
    ) -> tuple[bool, float]:
        distance = cls._distance_km(school, origin)
        return (distance is None, distance or 0.0)

    @staticmethod
    def _programme_key(school: SchoolInfo) -> tuple[int, int]:
        return (-(school.subjects_count or 0), -(school.cca_count or 0))

    @staticmethod
    def _reach_key(
        strength: float | None, scaled_score: float | None
    ) -> tuple[Reach, float]:
        if strength is None:
            return (Reach.WITHIN, 0.0)
        if scaled_score is None:
            return (Reach.UNKNOWN, 0.0)
        if strength >= scaled_score:
            return (Reach.WITHIN, 0.0)
        return (Reach.BEYOND, scaled_score)

    @staticmethod
    def _scaled_score(
        school: SchoolInfo, cutoffs: tuple[int, int] | None
    ) -> float | None:
        if school.psle_2017_cutoff is None or cutoffs is None:
            return None
        if cutoffs[1] == cutoffs[0]:
            return 0.0
        return (school.psle_2017_cutoff - cutoffs[0]) / (cutoffs[1] - cutoffs[0])
