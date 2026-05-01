import json
from urllib import error

from app.services.deepseek_service import DeepSeekClient
from app.services.ai_advisor_service import AiAdvisorService
from app.services.oorep_service import OorepService
from app.utils.errors import ApiError


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def test_deepseek_complete_json_returns_empty_dict_for_invalid_json(app, monkeypatch):
    def fake_urlopen(req, timeout):
        assert req.full_url == "https://api.deepseek.test/chat/completions"
        body = json.loads(req.data.decode("utf-8"))
        assert body["model"] == "deepseek-v4-pro"
        assert body["response_format"] == {"type": "json_object"}
        return FakeResponse({"choices": [{"message": {"content": "not-json"}}]})

    monkeypatch.setattr("app.services.deepseek_service.request.urlopen", fake_urlopen)

    with app.app_context():
        result = DeepSeekClient().complete_json("Return JSON", model="deepseek-v4-pro")

    assert result == {}


def test_deepseek_complete_text_uses_fast_model_and_disabled_thinking(app, monkeypatch):
    def fake_urlopen(req, timeout):
        body = json.loads(req.data.decode("utf-8"))
        assert body["model"] == "deepseek-v4-flash"
        assert body["thinking"] == {"type": "disabled"}
        return FakeResponse({"choices": [{"message": {"content": " Structured symptoms "}}]})

    monkeypatch.setattr("app.services.deepseek_service.request.urlopen", fake_urlopen)

    with app.app_context():
        result = DeepSeekClient().complete_text("Extract", model="deepseek-v4-flash")

    assert result == "Structured symptoms"


def test_deepseek_retries_transient_http_failures(app, monkeypatch):
    attempts = 0

    def fake_urlopen(req, timeout):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise error.HTTPError(req.full_url, 502, "bad gateway", hdrs=None, fp=None)
        return FakeResponse({"choices": [{"message": {"content": "ok"}}]})

    monkeypatch.setattr("app.services.deepseek_service.request.urlopen", fake_urlopen)
    monkeypatch.setattr("app.services.deepseek_service.time.sleep", lambda seconds: None)

    with app.app_context():
        result = DeepSeekClient().complete_text("Extract", model="deepseek-v4-flash")

    assert result == "ok"
    assert attempts == 2


def test_deepseek_does_not_retry_non_transient_http_failures(app, monkeypatch):
    attempts = 0

    def fake_urlopen(req, timeout):
        nonlocal attempts
        attempts += 1
        raise error.HTTPError(req.full_url, 400, "bad request", hdrs=None, fp=None)

    monkeypatch.setattr("app.services.deepseek_service.request.urlopen", fake_urlopen)
    monkeypatch.setattr("app.services.deepseek_service.time.sleep", lambda seconds: None)

    with app.app_context():
        try:
            DeepSeekClient().complete_text("Extract", model="deepseek-v4-flash")
        except ApiError as exc:
            assert exc.code == "deepseek_failed"
        else:
            raise AssertionError("Expected ApiError")

    assert attempts == 1


def test_oorep_service_posts_repertory_search_to_sidecar(app, monkeypatch):
    def fake_urlopen(req, timeout):
        assert req.full_url == "http://oorep-sidecar.test/search-repertory"
        body = json.loads(req.data.decode("utf-8"))
        assert body == {"symptom": "headache worse motion", "maxResults": 8, "includeRemedyStats": True}
        return FakeResponse({"rubrics": [], "remedyStats": []})

    monkeypatch.setattr("app.services.oorep_service.request.urlopen", fake_urlopen)

    with app.app_context():
        result = OorepService().search_repertory("headache worse motion")

    assert result == {"rubrics": [], "remedyStats": []}


def test_oorep_retries_transient_http_failures(app, monkeypatch):
    attempts = 0

    def fake_urlopen(req, timeout):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise error.HTTPError(req.full_url, 503, "unavailable", hdrs=None, fp=None)
        return FakeResponse({"rubrics": [], "remedyStats": []})

    monkeypatch.setattr("app.services.oorep_service.request.urlopen", fake_urlopen)
    monkeypatch.setattr("app.services.oorep_service.time.sleep", lambda seconds: None)

    with app.app_context():
        result = OorepService().search_repertory("headache worse motion")

    assert result == {"rubrics": [], "remedyStats": []}
    assert attempts == 2


def test_extract_symptoms_prompt_has_homeopathic_structure(app):
    captured = {}

    class FakeDeepSeek:
        def complete_text(self, prompt, model, system=None):
            captured["prompt"] = prompt
            captured["system"] = system
            return "structured"

    with app.app_context():
        result = AiAdvisorService(deepseek=FakeDeepSeek()).extract_symptoms("headache")

    assert result == "structured"
    assert "Rubric:" in captured["system"]
    assert "Modality:" in captured["system"]
    assert "Mentals" in captured["prompt"]
    assert "Raw patient text:" in captured["prompt"]
    assert "Mind > Anxiety > Night" in captured["system"]


def test_ai_advisor_retrieves_oorep_evidence_before_reasoning(app):
    calls = []

    class FakeOorep:
        def search_repertory(self, symptom, max_results=8):
            calls.append(("repertory", symptom))
            return {
                "rubrics": [
                    {
                        "rubric": "Head > Pain > Motion agg.",
                        "repertory": "kent",
                        "remedies": [{"name": "Bryonia", "weight": 4}],
                    }
                ],
                "remedyStats": [{"name": "Bryonia", "count": 1, "cumulativeWeight": 4}],
            }

        def search_materia_medica(self, symptom, remedy=None, max_results=5):
            calls.append(("materia", remedy))
            return {
                "results": [
                    {
                        "remedy": remedy,
                        "materiaMedica": "boericke",
                        "sections": [{"heading": "Head", "content": "Worse motion."}],
                    }
                ]
            }

    class FakeDeepSeek:
        def complete_json(self, prompt, model, system=None):
            if "Split this homeopathic case" in prompt:
                calls.append(("decompose", model))
                return {"symptoms": ["Headache worse motion"]}
            calls.append(("reason", model))
            assert "Head > Pain > Motion agg." in prompt
            return {
                "issues": "Headache",
                "differentiationLogic": "Bryonia has strongest evidence.",
                "remedies": [{"rank": "PRIMARY", "remedy": "Bryonia", "matchPercentage": 5, "evidence": []}],
            }

    with app.app_context():
        result = AiAdvisorService(deepseek=FakeDeepSeek(), oorep=FakeOorep()).suggest_remedies("Headache worse motion")

    assert calls == [
        ("decompose", "deepseek-v4-flash"),
        ("repertory", "Headache worse motion"),
        ("materia", "Bryonia"),
        ("reason", "deepseek-v4-pro"),
    ]
    assert result["remedies"][0]["remedy"] == "Bryonia"
    assert result["remedies"][0]["matchPercentage"] == 100
    assert result["remedies"][0]["evidenceScore"] == {
        "rubricCount": 1,
        "cumulativeWeight": 4,
        "maxPossibleWeight": 4,
        "percentage": 100,
        "quality": "strong",
    }
    assert result["evidenceQuality"] == "strong"


def test_ai_advisor_decomposes_and_merges_repertory_queries(app):
    calls = []

    class FakeOorep:
        def search_repertory(self, symptom, max_results=8):
            calls.append(("repertory", symptom, max_results))
            if symptom == "Headache worse motion":
                return {
                    "rubrics": [
                        {
                            "rubric": "Head > Pain > Motion agg.",
                            "repertory": "kent",
                            "remedies": [{"name": "Bryonia", "weight": 4}],
                        }
                    ],
                    "remedyStats": [{"name": "Bryonia", "count": 1, "cumulativeWeight": 4}],
                }
            return {
                "rubrics": [
                    {
                        "rubric": "Extremities > Burning > Feet > Night",
                        "repertory": "kent",
                        "remedies": [{"name": "Sulphur", "weight": 3}],
                    },
                    {
                        "rubric": "Head > Pain > Motion agg.",
                        "repertory": "kent",
                        "remedies": [{"name": "Bryonia", "weight": 4}],
                    },
                ],
                "remedyStats": [
                    {"name": "Sulphur", "count": 1, "cumulativeWeight": 3},
                    {"name": "Bryonia", "count": 1, "cumulativeWeight": 4},
                ],
            }

        def search_materia_medica(self, symptom, remedy=None, max_results=5):
            calls.append(("materia", remedy))
            return {"results": []}

    class FakeDeepSeek:
        def complete_json(self, prompt, model, system=None):
            if "Split this homeopathic case" in prompt:
                return {"symptoms": ["Headache worse motion", "Burning feet at night"]}
            return {
                "issues": "Mixed case",
                "differentiationLogic": "Compare Bryonia and Sulphur.",
                "remedies": [
                    {"rank": "PRIMARY", "remedy": "Bryonia"},
                    {"rank": "ALTERNATIVE", "remedy": "Sulphur"},
                ],
            }

    with app.app_context():
        result = AiAdvisorService(deepseek=FakeDeepSeek(), oorep=FakeOorep()).suggest_remedies("case")

    assert ("repertory", "Headache worse motion", 4) in calls
    assert ("repertory", "Burning feet at night", 4) in calls
    assert [item["remedy"] for item in result["remedies"]] == ["Bryonia", "Sulphur"]
    assert result["_meta"]["retrieval"]["queryCount"] == 2
    assert result["_meta"]["retrieval"]["rubricCount"] == 2


def test_ai_advisor_falls_back_to_original_symptoms_when_decomposition_empty(app):
    calls = []

    class FakeOorep:
        def search_repertory(self, symptom, max_results=8):
            calls.append(("repertory", symptom, max_results))
            return {
                "rubrics": [
                    {
                        "rubric": "Mind > Anxiety > Health",
                        "repertory": "kent",
                        "remedies": [{"name": "Arsenicum Album", "weight": 3}],
                    }
                ],
                "remedyStats": [{"name": "Arsenicum Album", "count": 1, "cumulativeWeight": 3}],
            }

        def search_materia_medica(self, symptom, remedy=None, max_results=5):
            return {"results": []}

    class FakeDeepSeek:
        def complete_json(self, prompt, model, system=None):
            if "Split this homeopathic case" in prompt:
                return {"symptoms": []}
            return {"remedies": [{"rank": "PRIMARY", "remedy": "Arsenicum Album"}]}

    with app.app_context():
        result = AiAdvisorService(deepseek=FakeDeepSeek(), oorep=FakeOorep()).suggest_remedies("anxiety about health")

    assert calls[0] == ("repertory", "anxiety about health", 8)
    assert result["remedies"][0]["remedy"] == "Arsenicum Album"


def test_ai_advisor_returns_insufficient_evidence_without_reasoning(app):
    class FakeOorep:
        def search_repertory(self, symptom, max_results=8):
            return {"rubrics": [], "remedyStats": []}

    class FakeDeepSeek:
        def complete_json(self, prompt, model, system=None):
            if "Split this homeopathic case" in prompt:
                return {"symptoms": ["unmatched symptom"]}
            raise AssertionError("Reasoning should not be called without OOREP evidence")

    with app.app_context():
        result = AiAdvisorService(deepseek=FakeDeepSeek(), oorep=FakeOorep()).suggest_remedies("unmatched symptom")

    assert result["issues"] == "Insufficient repertory evidence for these symptoms."
    assert result["differentiationLogic"] == ""
    assert result["remedies"] == []
    assert result["evidenceQuality"] == "insufficient"


def test_compact_evidence_truncates_materia_medica_at_sentence_boundary(app):
    text = "First sentence is clinically useful. " + ("Second sentence has extra detail " * 40)
    result_set = {
        "results": [
            {
                "remedy": "Bryonia",
                "materiaMedica": "boericke",
                "sections": [{"heading": "Head", "content": text}],
            }
        ]
    }

    with app.app_context():
        evidence = AiAdvisorService(deepseek=object(), oorep=object())._compact_evidence(
            {"rubrics": []},
            [result_set],
        )

    content = evidence["materiaMedica"][0]["sections"][0]["content"]
    assert content.endswith(".")
    assert len(content) <= 700
