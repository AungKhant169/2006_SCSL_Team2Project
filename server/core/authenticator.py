from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.user import Role, User, UserError

bearer = HTTPBearer(auto_error=False)
Bearer = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def get_requester(authentication: Bearer) -> User:
    return User.authenticate(authentication.credentials if authentication else "")


# The user making the request, resolved from the Authorization header.
Requester = Annotated[User, Depends(get_requester)]


def get_admin_requester(user: Requester) -> User:
    """Rejects everyone but administrators with a 403. Guards a whole admin router."""
    # The role is read from the database on every request, so a demotion takes effect immediately.
    if user.role != Role.ADMIN:
        raise UserError.ADMIN_REQUIRED()
    return user
