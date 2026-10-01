from fastapi import FastAPI

from core.exceptions import HttpError, http_error_handler
from routers import user_router

app = FastAPI()
app.include_router(user_router)
app.exception_handler(HttpError)(http_error_handler)
