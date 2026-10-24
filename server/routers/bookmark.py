from fastapi import APIRouter, status

from core.authenticator import Requester
from models.bookmark import Bookmark
from schemas.bookmark import BookmarkSchool

router = APIRouter(prefix="/bookmark", tags=["bookmark"])


@router.get("", response_model=list[BookmarkSchool])
def list_bookmarks(user: Requester):
    return Bookmark.for_user(user.id)


@router.put("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_bookmark(school_id: int, user: Requester):
    Bookmark.add(user.id, school_id)


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(school_id: int, user: Requester):
    Bookmark.remove(user.id, school_id)
