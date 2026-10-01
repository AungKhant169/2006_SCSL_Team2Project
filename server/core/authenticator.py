from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.user import User

bearer = HTTPBearer(auto_error=False)
Bearer = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def get_requester(authentication: Bearer) -> User:
    return User.authenticate(authentication.credentials if authentication else "")


# The user making the request, resolved from the Authorization header.
Requester = Annotated[User, Depends(get_requester)]
