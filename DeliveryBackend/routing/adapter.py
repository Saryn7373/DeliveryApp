class ExternalGeoService:
    """Имитация внешнего сервиса с несовместимым интерфейсом."""

    def get_location(self, address: str) -> dict:
        # В реальности здесь был бы HTTP-запрос к геосервису
        return {
            "address": address,
            "coords": {"x": 55.75, "y": 37.61},
        }


class GeoServiceAdapter:
    """
    Адаптер: приводит ответ ExternalGeoService
    к формату (lat, lon) который ожидает остальная система.
    """

    def __init__(self):
        self._service = ExternalGeoService()

    def get_coordinates(self, address: str) -> tuple[float, float]:
        raw = self._service.get_location(address)
        return raw["coords"]["x"], raw["coords"]["y"]