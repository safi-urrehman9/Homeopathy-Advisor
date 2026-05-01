import json


class FakeCache:
    def __init__(self):
        self.values = {}

    def get_json(self, key):
        return self.values.get(key)

    def set_json(self, key, value, ttl):
        self.values[key] = value


class FakeGemini:
    def __init__(self):
        self.calls = 0

    def extract_symptoms(self, text):
        self.calls += 1
        return f"Extracted: {text}"

    def suggest_remedies(self, symptoms, past_consultations):
        self.calls += 1
        return {
            "issues": symptoms,
            "differentiationLogic": "Primary fits better.",
            "remedies": [
                {
                    "rank": "PRIMARY",
                    "remedy": "Nux Vomica",
                    "matchPercentage": 88.0,
                    "reasoning": "Modalities match.",
                    "dosage": "30C once daily",
                    "followUp": "7 days",
                }
            ],
        }

    def search_materia_medica(self, query):
        self.calls += 1
        return f"Materia: {query}"

    def process_audio(self, base64_audio, mime_type):
        self.calls += 1
        return "Audio symptoms"

    def process_image(self, base64_image, mime_type):
        self.calls += 1
        return "Image symptoms"


def test_ai_extract_uses_redis_cache(client, auth_headers, monkeypatch):
    fake_cache = FakeCache()
    fake_gemini = FakeGemini()
    monkeypatch.setattr("app.api.v1.ai.get_cache_service", lambda: fake_cache)
    monkeypatch.setattr("app.api.v1.ai.get_gemini_service", lambda: fake_gemini)

    first = client.post("/api/v1/ai/extract-symptoms", json={"text": "Burning feet"}, headers=auth_headers)
    second = client.post("/api/v1/ai/extract-symptoms", json={"text": "Burning feet"}, headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.get_json()["data"]["text"] == "Extracted: Burning feet"
    assert second.get_json()["meta"]["cache"] == "hit"
    assert fake_gemini.calls == 1


def test_ai_suggest_remedies_validates_shape(client, auth_headers, monkeypatch):
    fake_cache = FakeCache()
    fake_gemini = FakeGemini()
    monkeypatch.setattr("app.api.v1.ai.get_cache_service", lambda: fake_cache)
    monkeypatch.setattr("app.api.v1.ai.get_gemini_service", lambda: fake_gemini)

    response = client.post(
        "/api/v1/ai/suggest-remedies",
        json={"symptoms": "Irritable digestion", "pastConsultations": []},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["remedies"][0]["rank"] == "PRIMARY"
    assert data["differentiationLogic"] == "Primary fits better."


def test_ai_materia_requires_query(client, auth_headers):
    response = client.post("/api/v1/ai/materia-medica", json={"query": ""}, headers=auth_headers)

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "validation_error"
