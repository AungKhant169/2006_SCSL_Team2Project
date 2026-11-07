from enum import Enum

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class HttpError(Exception):
    """
    This class is the exception that maps to an HTTP response.
    It is not meant to be raised directly, but rather, by calling a BaseError member.
    """

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code, detail)
        self.status_code = status_code
        self.detail = detail


class BaseError(Enum):
    """
    This class is a base class to map database errors into HTTP responses.
    It is not meant to be used directly, but rather, as an inherited class.
    All errors are defined as an attribute tuple (status_code, detail).
    Raise an error by calling it `raise UserError.USER_NOT_FOUND()`.
    """

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

    def __call__(self) -> HttpError:
        return HttpError(self.status_code, self.detail)


def http_error_handler(request: Request, exc: HttpError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def rw_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    This function replaces FastAPI's validation handler, returning only each error's loc and msg.
    The value sent is never echoed back, so a mistyped password stays out of the response.
    """
    errors = [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": errors},
    )
