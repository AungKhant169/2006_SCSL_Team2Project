from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from models.user import User
from schemas.roadmap import CreateRoadmapRequest

RequestT = TypeVar("RequestT", bound=CreateRoadmapRequest)


class RoadmapGenerator(ABC, Generic[RequestT]):
    """
    The strategy a roadmap is generated with (IRoadmapGenerator in the design class diagram).

    The rule-based and the AI generators both implement it, so each can be replaced without
    touching the router that serves it. Each takes the request that carries its own settings: the
    rule-based plan also gets what to rank by and how far a school may be.
    """

    @classmethod
    @abstractmethod
    def generate(cls, user: User, request: RequestT) -> list[int]:
        """Return the ids of the chosen schools in preference order, at most PLAN_LENGTH."""
