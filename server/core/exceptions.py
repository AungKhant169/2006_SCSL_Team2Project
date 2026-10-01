from enum import Enum

from fastapi import Request
from fastapi.responses import JSONResponse


class HttpError(Exception, Enum):
    """
    This class is a base class to map database errors into HTTP responses.
    It is not meant to be used directly, but rather, as an inherited class.
    All errors are be defined as an attribute tuple (status_code, detail).
    """

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def http_error_handler(request: Request, exc: HttpError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
