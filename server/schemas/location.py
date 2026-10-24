from pydantic import BaseModel


class Location(BaseModel):
    postal: str
    # Name of the postal district the code belongs to.
    district: str
    # Centre of that district: the point distances to schools are measured from.
    latitude: float
    longitude: float
