"""Give a user the admin role (or take it away).

Run from server/:
    python -m scripts.make_admin alice            # make alice an admin
    python -m scripts.make_admin alice --remove   # back to a normal user
The user must already be registered.
"""

import sys

from models.user import ROLE_ADMIN, ROLE_USER, User


def main(argv: list[str]) -> int:
    names = [a for a in argv if not a.startswith("--")]
    if len(names) != 1:
        print(__doc__)
        return 1
    if not (user := User.get_by_key(username=names[0])):
        print(f"No user called '{names[0]}'. Register that account first.")
        return 1
    role = ROLE_USER if "--remove" in argv else ROLE_ADMIN
    User.update(user.id, role=role)
    print(f"{user.username} is now '{role}'")
    if role == ROLE_USER and User.get_by_id(user.id).is_admin:
        print(
            "Note: this username is listed in ADMIN_USERNAMES in .env, so it is "
            "still an admin. Remove it from that list to take admin away."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
