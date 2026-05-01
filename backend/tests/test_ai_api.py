class FakeCache:
    def __init__(self):
        self.values = {}

    def get_json(self, key):
        return self.values.get(key)

    def set_json(self, key, value, ttl):
        self.values[key] = value


class FakeAiAdvisor:
    def __init__(self):
        self.calls = 0
        self.seen_past_consultations = None

    def extract_symptoms(self, text):
        self.calls += 1
        return f"Extracted: {text}"

    def suggest_remedies(self, symptoms, patient_summary="", recent_consultations=None):
        self.calls += 1
        self.seen_past_consultations = recent_consultations
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
                    "evidence": [
                        {
                            "source": "kent",
                            "type": "repertory",
                            "text": "Stomach > Irritability",
                        }
                    ],
                }
            ],
        }

    def search_materia_medica(self, query):
        self.calls += 1
        return f"Materia: {query}"

    def process_audio(self, base64_audio, mime_type=""):
        self.calls += 1
        return f"Audio: {mime_type}:{base64_audio}"

    def process_image(self, base64_image, mime_type=""):
        self.calls += 1
        return f"Image: {mime_type}:{base64_image}"


def test_ai_extract_uses_redis_cache(client, auth_headers, monkeypatch):
    fake_cache = FakeCache()
    fake_ai = FakeAiAdvisor()
    monkeypatch.setattr("app.api.v1.ai.get_cache_service", lambda: fake_cache)
    monkeypatch.setattr("app.api.v1.ai.get_ai_advisor_service", lambda: fake_ai)

    first = client.post("/api/v1/ai/extract-symptoms", json={"text": "Burning feet"}, headers=auth_headers)
    second = client.post("/api/v1/ai/extract-symptoms", json={"text": "Burning feet"}, headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.get_json()["data"]["text"] == "Extracted: Burning feet"
    assert second.get_json()["meta"]["cache"] == "hit"
    assert fake_ai.calls == 1


def test_ai_suggest_remedies_uses_compact_recent_history(client, auth_headers, monkeypatch):
    fake_cache = FakeCache()
    fake_ai = FakeAiAdvisor()
    monkeypatch.setattr("app.api.v1.ai.get_cache_service", lambda: fake_cache)
    monkeypatch.setattr("app.api.v1.ai.get_ai_advisor_service", lambda: fake_ai)

    response = client.post(
        "/api/v1/ai/suggest-remedies",
        json={
            "symptoms": "Irritable digestion",
            "patientSummary": "Long-term gastric irritability.",
            "pastConsultations": [
                {"symptoms": "old 1"},
                {"symptoms": "old 2"},
                {"symptoms": "old 3"},
                {"symptoms": "recent 1"},
                {"symptoms": "recent 2"},
            ],
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["remedies"][0]["rank"] == "PRIMARY"
    assert data["differentiationLogic"] == "Primary fits better."
    assert data["remedies"][0]["evidence"][0]["source"] == "kent"
    assert fake_ai.seen_past_consultations == [
        {"date": "", "symptoms": "old 1", "prescribedRemedy": "", "potency": "", "notes": ""},
        {"date": "", "symptoms": "old 2", "prescribedRemedy": "", "potency": "", "notes": ""},
        {"date": "", "symptoms": "old 3", "prescribedRemedy": "", "potency": "", "notes": ""},
        {"date": "", "symptoms": "recent 1", "prescribedRemedy": "", "potency": "", "notes": ""},
        {"date": "", "symptoms": "recent 2", "prescribedRemedy": "", "potency": "", "notes": ""},
    ]


def test_ai_suggest_remedies_can_load_patient_summary_and_recent_history(client, auth_headers, monkeypatch):
    fake_cache = FakeCache()
    fake_ai = FakeAiAdvisor()
    monkeypatch.setattr("app.api.v1.ai.get_cache_service", lambda: fake_cache)
    monkeypatch.setattr("app.api.v1.ai.get_ai_advisor_service", lambda: fake_ai)

    patient = client.post(
        "/api/v1/patients",
        json={"name": "Ravi", "aiSummary": "Compact long-term summary."},
        headers=auth_headers,
    ).get_json()["data"]
    for symptom in ["old 1", "old 2", "recent 1", "recent 2"]:
        client.post(
            "/api/v1/consultations",
            json={"patientId": patient["id"], "symptoms": symptom},
            headers=auth_headers,
        )

    response = client.post(
        "/api/v1/ai/suggest-remedies",
        json={"patientId": patient["id"], "symptoms": "Current symptoms"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert [item["symptoms"] for item in fake_ai.seen_past_consultations] == ["old 1", "old 2", "recent 1", "recent 2"]
    assert all(
        set(item) == {"date", "symptoms", "prescribedRemedy", "potency", "notes"}
        for item in fake_ai.seen_past_consultations
    )


def test_ai_materia_requires_query(client, auth_headers):
    response = client.post("/api/v1/ai/materia-medica", json={"query": ""}, headers=auth_headers)

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "validation_error"


def test_ai_audio_and_image_require_payloads(client, auth_headers):
    audio = client.post("/api/v1/ai/process-audio", json={"base64Audio": ""}, headers=auth_headers)
    image = client.post("/api/v1/ai/process-image", json={"base64Image": ""}, headers=auth_headers)

    assert audio.status_code == 400
    assert image.status_code == 400


def test_ai_audio_and_image_report_missing_provider(client, auth_headers):
    audio = client.post(
        "/api/v1/ai/process-audio",
        json={"base64Audio": "abc", "mimeType": "audio/webm"},
        headers=auth_headers,
    )
    image = client.post(
        "/api/v1/ai/process-image",
        json={"base64Image": "abc", "mimeType": "image/png"},
        headers=auth_headers,
    )

    assert audio.status_code == 501
    assert image.status_code == 501
    assert audio.get_json()["error"]["code"] == "media_provider_not_configured"
    assert image.get_json()["error"]["code"] == "media_provider_not_configured"


def test_ai_audio_and_image_can_use_injected_media_service(client, auth_headers, monkeypatch):
    fake_ai = FakeAiAdvisor()
    monkeypatch.setattr("app.api.v1.ai.get_ai_advisor_service", lambda: fake_ai)

    audio = client.post(
        "/api/v1/ai/process-audio",
        json={"base64Audio": "abc", "mimeType": "audio/webm"},
        headers=auth_headers,
    )
    image = client.post(
        "/api/v1/ai/process-image",
        json={"base64Image": "abc", "mimeType": "image/png"},
        headers=auth_headers,
    )

    assert audio.status_code == 200
    assert image.status_code == 200
    assert audio.get_json()["data"]["text"] == "Audio: audio/webm:abc"
    assert image.get_json()["data"]["text"] == "Image: image/png:abc"
    assert fake_ai.calls == 2
