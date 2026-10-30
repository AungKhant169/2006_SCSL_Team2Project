from fastapi import APIRouter

from core.geolocation import Geolocation, LocationError
from schemas.location import Location

router = APIRouter(prefix="/location", tags=["location"])


@router.get("/{postal}", response_model=Location)
def locate_postal_code(postal: str):
    """Where distances from a postal code are measured from: the centre of its postal district."""
    if (district := Geolocation.postal_district(postal)) is None:
        raise LocationError.POSTAL_NOT_FOUND()
    area = Geolocation.DISTRICTS[district]
    latitude, longitude = area.centroid
    return Location(
        postal=postal.strip(),
        district=area.name,
        latitude=latitude,
        longitude=longitude,
    )
