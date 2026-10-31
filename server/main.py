from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.exceptions import HttpError, http_error_handler
from core.settings import settings
from routers import (
    admin_router,
    bookmark_router,
    location_router,
    profile_router,
    review_router,
    roadmap_router,
    school_info_router,
    user_router,
)

app = FastAPI()

frontend_origin = settings.frontend_origin

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Lets the client read the name of an exported file.
    expose_headers=["Content-Disposition"],
)

app.include_router(user_router)
app.include_router(profile_router)
app.include_router(location_router)
app.include_router(admin_router)
app.include_router(roadmap_router)
app.include_router(school_info_router)
app.include_router(review_router)
app.include_router(bookmark_router)
app.exception_handler(HttpError)(http_error_handler)


@app.get("/")
async def root():
    return {"message": "Pythong running at http://localhost:127.0.0.1:8000"}
