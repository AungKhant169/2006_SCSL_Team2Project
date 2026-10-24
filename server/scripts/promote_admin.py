import sys

from models.user import Role, User


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m scripts.promote_admin <username>")
    if not (user := User.get_by_key(username=sys.argv[1])):
        sys.exit(f"No account is named {sys.argv[1]!r}")
    User.update(user.id, role=Role.ADMIN)
    print(f"{user.username} is now an administrator")


if __name__ == "__main__":
    main()
