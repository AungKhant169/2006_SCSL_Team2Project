from core.geolocation import Geolocation, LocationError
from tests.conftest import client


class TestLocatePostalCode:
    def test_returns_the_centre_of_the_postal_district(self):
        response = client.get("/location/556000")
        assert response.status_code == 200
        body = response.json()
        # Sector 55 belongs to district 19 (Serangoon Garden, Hougang, Punggol).
        latitude, longitude = Geolocation.DISTRICTS[19].centroid
        assert body == {
            "postal": "556000",
            "district": Geolocation.DISTRICTS[19].name,
            "latitude": latitude,
            "longitude": longitude,
        }

    def test_postal_code_in_no_district(self):
        response = client.get("/location/990000")
        assert (response.status_code, response.json()["detail"]) == (
            LocationError.POSTAL_NOT_FOUND.args
        )

    def test_malformed_postal_code(self):
        response = client.get("/location/12345")
        assert response.status_code == LocationError.POSTAL_NOT_FOUND.status_code
