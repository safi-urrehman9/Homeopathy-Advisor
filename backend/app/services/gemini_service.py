from __future__ import annotations

import json
from typing import Any

from flask import current_app

from app.utils.errors import ApiError


class GeminiService:
    def __init__(self):
        api_key = current_app.config["GEMINI_API_KEY"]
        if not api_key:
            raise ApiError("GEMINI_API_KEY is not configured.", status_code=500, code="ai_not_configured")

        try:
            from google import genai
        except Exception as exc:
            raise ApiError("Google GenAI SDK is not installed.", status_code=500, code="ai_not_configured") from exc

        self.client = genai.Client(api_key=api_key)

    def extract_symptoms(self, text: str) -> str:
        response = self.client.models.generate_content(
            model=current_app.config["GEMINI_TEXT_MODEL"],
            contents=(
                "Extract the key homeopathic symptoms from the following text in high detail. "
                "Provide a comprehensive list of repertory rubrics followed by a detailed summary "
                "of the symptoms. Format cleanly with plain text dashes and no markdown symbols. "
                f"Text: {text}"
            ),
        )
        return response.text or ""

    def suggest_remedies(self, symptoms: str, past_consultations: list[dict[str, Any]]) -> dict[str, Any]:
        history_context = ""
        if past_consultations:
            lines = []
            for consultation in list(reversed(past_consultations)):
                lines.append(
                    "- Date: {date}\n  Symptoms: {symptoms}\n  Prescribed: {remedy} ({potency})\n  Notes/Diagnosis: {notes}".format(
                        date=consultation.get("createdAt") or consultation.get("date") or "",
                        symptoms=consultation.get("symptoms") or "",
                        remedy=consultation.get("prescribedRemedy") or "",
                        potency=consultation.get("potency") or "",
                        notes=consultation.get("notes") or "",
                    )
                )
            history_context = (
                "Patient's Past Consultations (chronological order; use this to understand timeline, "
                "case progression, and remedies already tried):\n"
                + "\n\n".join(lines)
                + "\n\n"
            )

        prompt = f"""{history_context}Based on the following CURRENT homeopathic symptoms, perform a rigorous homeopathic case analysis.
1. Summarize the patient's issues and constitutional profile.
2. Provide ranking logic for the top 3 remedies as PRIMARY, ALTERNATIVE, and DIFFERENTIAL with percentage match.
3. For each remedy, provide rationale, proper dosage, and follow-up.
4. Provide differentiation logic explaining why lower ranked remedies are below the primary.
Return only valid JSON with keys issues, differentiationLogic, and remedies.
Current Symptoms: {symptoms}"""

        response = self.client.models.generate_content(
            model=current_app.config["GEMINI_TEXT_MODEL"],
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        try:
            parsed = json.loads(response.text or "{}")
        except json.JSONDecodeError:
            parsed = {}
        return {
            "issues": parsed.get("issues", ""),
            "differentiationLogic": parsed.get("differentiationLogic", ""),
            "remedies": parsed.get("remedies", []),
        }

    def search_materia_medica(self, query: str) -> str:
        response = self.client.models.generate_content(
            model=current_app.config["GEMINI_TEXT_MODEL"],
            contents=(
                "Search the homeopathic Materia Medica for the following query and provide a concise "
                f"summary of relevant remedies and indications. Query: {query}"
            ),
        )
        return response.text or ""

    def process_audio(self, base64_audio: str, mime_type: str) -> str:
        response = self.client.models.generate_content(
            model=current_app.config["GEMINI_AUDIO_MODEL"],
            contents=[
                {
                    "inline_data": {"data": base64_audio, "mime_type": mime_type},
                },
                {"text": "Transcribe the audio and extract the key homeopathic symptoms."},
            ],
        )
        return response.text or ""

    def process_image(self, base64_image: str, mime_type: str) -> str:
        response = self.client.models.generate_content(
            model=current_app.config["GEMINI_IMAGE_MODEL"],
            contents=[
                {
                    "inline_data": {"data": base64_image, "mime_type": mime_type},
                },
                {
                    "text": "Analyze this image (lab report or physical symptom) and extract relevant information for a homeopathic case.",
                },
            ],
        )
        return response.text or ""


def get_gemini_service() -> GeminiService:
    return GeminiService()
