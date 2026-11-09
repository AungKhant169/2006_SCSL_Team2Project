import pytest

from core.roadmap_ai import AIRoadmapGenerator
from core.roadmap_generator import RoadmapGenerator
from core.roadmap_rules import RuleRoadmapGenerator


@pytest.mark.parametrize("generator", [RuleRoadmapGenerator, AIRoadmapGenerator])
def test_each_generator_is_a_roadmap_generation_strategy(generator):
    assert issubclass(generator, RoadmapGenerator)
    assert "generate" in vars(generator)


def test_the_strategy_has_nothing_to_generate_by_itself():
    with pytest.raises(TypeError):
        RoadmapGenerator()
