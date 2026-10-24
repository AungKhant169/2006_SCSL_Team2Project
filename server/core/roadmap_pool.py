from models.school_record import SchoolInfo


def candidate_pool(stage: str) -> dict[int, SchoolInfo]:
    """The schools a roadmap for the stage can choose from, by name."""
    schools, _ = SchoolInfo.search(stage=stage, limit=1000, load_programmes=True)
    return {school.id: school for school in schools}
