from models.school_record import SchoolInfo

STAGE_LEVELS = {
    "preschool": (),
    "primary": ("PRIMARY",),
    "secondary": ("SECONDARY",),  # covers "SECONDARY (S1-S5)" and "SECONDARY (S1-S4)"
    "postsec": ("POLYTECHNIC", "JUNIOR COLLEGE"),
    "uni": ("UNI",),
}


def candidate_pool(stage: str) -> dict[int, SchoolInfo]:
    pool: dict[int, SchoolInfo] = {}
    for level in STAGE_LEVELS[stage]:
        schools, _ = SchoolInfo.search(level=level, limit=1000, load_programmes=True)
        for school in schools:
            pool[school.id] = school
    return dict(sorted(pool.items(), key=lambda kv: kv[1].school_name))
