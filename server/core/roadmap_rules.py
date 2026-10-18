from enum import IntEnum

from core.geolocation import Geolocation
from core.roadmap_pool import candidate_pool
from models.roadmap import PLAN_LENGTH
from models.school_record import SchoolInfo
from models.user import User
from schemas.roadmap import CreateRoadmapRequest


class Reach(IntEnum):
    """Comparison of a score to the cutoff of a school using T-score spanned over 2017 cutoff as the basis."""

    WITHIN = 0  # within reach
    UNKNOWN = 1  # missing school data
    BEYOND = 2  # out of reach


class RuleRoadmapGenerator:
    @classmethod
    def generate(cls, user: User, request: CreateRoadmapRequest) -> list[int]:
        if not (pool := list(candidate_pool(request.stage).values())):
            return []

        match request.stage:
            case "primary":
                ranked = cls._rank_primary(pool, request)
            case "secondary":
                ranked = cls._rank_secondary(pool, request)
            case "postsec":
                ranked = cls._rank_postsec(pool, request)
            case _:
                return []

        return [school.id for school in ranked[:PLAN_LENGTH]]

    @classmethod
    def _rank_primary(cls, pool: list[SchoolInfo], request: CreateRoadmapRequest):
        origin = Geolocation.postal_location(request.postal)
        return sorted(pool, key=lambda s: cls._distance_key(s, origin))

    @classmethod
    def _rank_secondary(cls, pool: list[SchoolInfo], request: CreateRoadmapRequest):
        origin = Geolocation.postal_location(request.postal)
        # Bounds of T-score to match AL-score.
        cutoffs = [s.psle_2017_cutoff for s in pool if s.psle_2017_cutoff is not None]
        bounds = (min(cutoffs), max(cutoffs)) if cutoffs else None
        # Normalize AL-score.
        score = request.previous_academic_score
        strength = None if score is None else (32 - min(max(score, 4), 32)) / (32 - 4)

        return sorted(
            pool,
            key=lambda s: (
                *cls._reach_key(strength, cls._scaled_score(s, bounds)),
                *cls._distance_key(s, origin),
            ),
        )

    @classmethod
    def _rank_postsec(cls, pool: list[SchoolInfo], request: CreateRoadmapRequest):
        # TODO: Add more vectors to better fit the recommendations.
        return sorted(pool, key=cls._programme_key)

    @staticmethod
    def _distance_key(
        school: SchoolInfo, origin: tuple[float, float] | None
    ) -> tuple[bool, float]:
        if origin is None:
            return (False, 0.0)
        if school.latitude is None or school.longitude is None:
            return (True, 0.0)

        distance = Geolocation.haversine_km(*origin, school.latitude, school.longitude)
        return (False, distance)

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
