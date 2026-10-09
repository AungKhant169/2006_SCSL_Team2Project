import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.exceptions import HttpError, http_error_handler
from routers import user_router, roadmap_router

load_dotenv()

app = FastAPI()

frontend_origin = os.environ["FRONTEND_ORIGIN"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(roadmap_router)
app.exception_handler(HttpError)(http_error_handler)


@app.get("/")
async def root():
    return {"message": "Pythong running at http://localhost:127.0.0.1:8000"}
