"""The yearly entry figures a school can publish (REQ-1.13)."""

from enum import StrEnum


class Measure(StrEnum):
    """What a benchmark row measures. Each row holds a `low` and a `high` figure for one year.

    PSLE_AL   PSLE AL scores of the students posted to a secondary school: `low` is the best
              (smallest) and `high` the worst, which is the cut-off. Lower is better.
    L1R5      Net L1R5 aggregate (after bonus points) of the students admitted to a junior college
              or Millennia Institute through the JAE: `low` the best and `high` the cut-off.
              Lower is better.
    ELR2B2    The same for the net ELR2B2 aggregate at a polytechnic or ITE college.
    GPA       Grade point average (0 to 4) of the 10th (`low`) and 90th (`high`) percentile of the
              students admitted to a polytechnic or university. Higher is better.
    """

    PSLE_AL = "PSLE_AL"
    L1R5 = "L1R5"
    ELR2B2 = "ELR2B2"
    GPA = "GPA"

    @property
    def lower_is_better(self) -> bool:
        return self is not Measure.GPA
