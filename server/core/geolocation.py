import math
import re
from typing import ClassVar, NamedTuple

EARTH_RADIUS_KM = 6371
POSTAL_PATTERN = re.compile(r"\d{6}")


class District(NamedTuple):
    name: str
    sectors: tuple[int, ...]
    centroid: tuple[float, float]


class Geolocation:
    # The mappings were referenced from https://file.go.gov.sg/list-of-postal-districts.pdf (retrieved 2026-10-18).
    # The centroids are an approximate of the center of the neighbourhood.
    DISTRICTS: ClassVar[dict[int, District]] = {
        1: District(
            "Raffles Place, Cecil, Marina, People's Park",
            (1, 2, 3, 4, 5, 6),
            (1.2840, 103.8510),
        ),
        2: District(
            "Anson, Tanjong Pagar",
            (7, 8),
            (1.2760, 103.8440),
        ),
        3: District(
            "Queenstown, Tiong Bahru",
            (14, 15, 16),
            (1.2860, 103.8190),
        ),
        4: District(
            "Telok Blangah, Harbourfront",
            (9, 10),
            (1.2650, 103.8200),
        ),
        5: District(
            "Pasir Panjang, Hong Leong Garden, Clementi New Town",
            (11, 12, 13),
            (1.3000, 103.7650),
        ),
        6: District(
            "High Street, Beach Road (part)",
            (17,),
            (1.2930, 103.8520),
        ),
        7: District(
            "Middle Road, Golden Mile",
            (18, 19),
            (1.3000, 103.8560),
        ),
        8: District(
            "Little India",
            (20, 21),
            (1.3100, 103.8530),
        ),
        9: District(
            "Orchard, Cairnhill, River Valley",
            (22, 23),
            (1.3000, 103.8300),
        ),
        10: District(
            "Ardmore, Bukit Timah, Holland Road, Tanglin",
            (24, 25, 26, 27),
            (1.3150, 103.8060),
        ),
        11: District(
            "Watten Estate, Novena, Thomson",
            (28, 29, 30),
            (1.3200, 103.8390),
        ),
        12: District(
            "Balestier, Toa Payoh, Serangoon",
            (31, 32, 33),
            (1.3340, 103.8560),
        ),
        13: District(
            "Macpherson, Braddell",
            (34, 35, 36, 37),
            (1.3360, 103.8690),
        ),
        14: District(
            "Geylang, Eunos",
            (38, 39, 40, 41),
            (1.3200, 103.8930),
        ),
        15: District(
            "Katong, Joo Chiat, Amber Road",
            (42, 43, 44, 45),
            (1.3020, 103.9030),
        ),
        16: District(
            "Bedok, Upper East Coast, Eastwood, Kew Drive",
            (46, 47, 48),
            (1.3240, 103.9300),
        ),
        17: District(
            "Loyang, Changi",
            (49, 50, 81),
            (1.3450, 103.9630),
        ),
        18: District(
            "Tampines, Pasir Ris",
            (51, 52),
            (1.3540, 103.9430),
        ),
        19: District(
            "Serangoon Garden, Hougang, Punggol",
            (53, 54, 55, 82),
            (1.3700, 103.8930),
        ),
        20: District(
            "Bishan, Ang Mo Kio",
            (56, 57),
            (1.3620, 103.8400),
        ),
        21: District(
            "Upper Bukit Timah, Clementi Park, Ulu Pandan",
            (58, 59),
            (1.3400, 103.7760),
        ),
        22: District(
            "Jurong",
            (60, 61, 62, 63, 64),
            (1.3330, 103.7430),
        ),
        23: District(
            "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang",
            (65, 66, 67, 68),
            (1.3840, 103.7470),
        ),
        24: District(
            "Lim Chu Kang, Tengah",
            (69, 70, 71),
            (1.3900, 103.7100),
        ),
        25: District(
            "Kranji, Woodgrove",
            (72, 73),
            (1.4380, 103.7870),
        ),
        26: District(
            "Upper Thomson, Springleaf",
            (77, 78),
            (1.3800, 103.8330),
        ),
        27: District(
            "Yishun, Sembawang",
            (75, 76),
            (1.4300, 103.8350),
        ),
        28: District(
            "Seletar",
            (79, 80),
            (1.4040, 103.8710),
        ),
    }

    SECTORS: ClassVar[dict[int, int]] = {
        sector: district
        for district, body in DISTRICTS.items()
        for sector in body.sectors
    }

    @classmethod
    def haversine_km(cls, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        phi1, lambda1, phi2, lambda2 = map(math.radians, (lat1, lon1, lat2, lon2))
        sin_half_lat = math.sin((phi2 - phi1) / 2)
        sin_half_lon = math.sin((lambda2 - lambda1) / 2)
        a = sin_half_lat**2 + math.cos(phi1) * math.cos(phi2) * sin_half_lon**2
        return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))

    @classmethod
    def postal_district(cls, postal: str | None) -> int | None:
        postal = (postal or "").strip()
        if POSTAL_PATTERN.fullmatch(postal):
            return cls.SECTORS.get(int(postal[:2]))

    @classmethod
    def postal_location(cls, postal: str | None) -> tuple[float, float] | None:
        district = cls.postal_district(postal)
        return None if district is None else cls.DISTRICTS[district].centroid
