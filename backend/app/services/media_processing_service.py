from __future__ import annotations

from app.utils.errors import ApiError


class MediaProcessingService:
    def process_audio(self, base64_audio: str, mime_type: str = "") -> str:
        raise ApiError(
            "Media processing provider is not configured.",
            status_code=501,
            code="media_provider_not_configured",
        )

    def process_image(self, base64_image: str, mime_type: str = "") -> str:
        raise ApiError(
            "Media processing provider is not configured.",
            status_code=501,
            code="media_provider_not_configured",
        )


def get_media_processing_service() -> MediaProcessingService:
    return MediaProcessingService()
