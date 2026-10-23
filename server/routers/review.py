
from fastapi import APIRouter, status

from core.authenticator import Requester
from models.review import Review
from schemas.review import ReviewRequest, ReviewResponse

router = APIRouter(prefix="/review", tags=["review"])


def to_response(review: Review, username: str) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        school_id=review.school_id,
        username=username,
        text=review.text,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("/school/{school_id}", response_model=list[ReviewResponse])
def list_reviews(school_id: int):
    return [to_response(review, name) for review, name in Review.for_school(school_id)]


@router.post("/school/{school_id}", response_model=ReviewResponse)
def submit_review(school_id: int, data: ReviewRequest, user: Requester):
    return to_response(Review.submit(user.id, school_id, data.text), user.username)


@router.patch("/{review_id}", response_model=ReviewResponse)
def edit_review(review_id: int, data: ReviewRequest, user: Requester):
    return to_response(Review.edit(user.id, review_id, data.text), user.username)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: int, user: Requester):
    Review.remove(user.id, review_id)