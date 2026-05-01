from datetime import datetime, timedelta, timezone


def test_consultations_are_chronological_and_dashboard_returns_today(client, auth_headers):
    patient = client.post(
        "/api/v1/patients",
        json={"name": "Ravi Sharma", "phone": "555-0200"},
        headers=auth_headers,
    ).get_json()["data"]

    older = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    newer = datetime.now(timezone.utc).isoformat()

    client.post(
        "/api/v1/consultations",
        json={
            "patientId": patient["id"],
            "date": older,
            "symptoms": "Headache worse sun",
            "repertorization": "{}",
            "prescribedRemedy": "Nat Mur",
            "potency": "30C",
            "notes": "Initial",
        },
        headers=auth_headers,
    )
    client.post(
        "/api/v1/consultations",
        json={
            "patientId": patient["id"],
            "date": newer,
            "symptoms": "Improved sleep",
            "prescribedRemedy": "Nat Mur",
            "potency": "200C",
            "notes": "Follow-up",
        },
        headers=auth_headers,
    )

    consultation_response = client.get(
        f"/api/v1/patients/{patient['id']}/consultations",
        headers=auth_headers,
    )

    assert consultation_response.status_code == 200
    symptoms = [item["symptoms"] for item in consultation_response.get_json()["data"]]
    assert symptoms == ["Improved sleep", "Headache worse sun"]

    appointment_time = datetime.now(timezone.utc).replace(hour=9, minute=30, second=0, microsecond=0)
    client.post(
        "/api/v1/appointments",
        json={
            "patientId": patient["id"],
            "date": appointment_time.isoformat(),
            "notes": "Follow-up check",
        },
        headers=auth_headers,
    )

    dashboard_response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.get_json()["data"]
    assert dashboard["todayAppointments"][0]["patientName"] == "Ravi Sharma"
    assert dashboard["recentPatients"][0]["name"] == "Ravi Sharma"


def test_appointment_window_filter_and_delete(client, auth_headers):
    patient = client.post("/api/v1/patients", json={"name": "Mina"}, headers=auth_headers).get_json()["data"]
    today = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    first = client.post(
        "/api/v1/appointments",
        json={"patientId": patient["id"], "date": today.isoformat(), "notes": "Today"},
        headers=auth_headers,
    ).get_json()["data"]
    client.post(
        "/api/v1/appointments",
        json={"patientId": patient["id"], "date": tomorrow.isoformat(), "notes": "Tomorrow"},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/v1/appointments?start={today.date().isoformat()}&end={tomorrow.date().isoformat()}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert [item["notes"] for item in response.get_json()["data"]] == ["Today"]

    delete_response = client.delete(f"/api/v1/appointments/{first['id']}", headers=auth_headers)
    assert delete_response.status_code == 204


def test_create_consultation_updates_compact_ai_summary(app, client, auth_headers, monkeypatch):
    class FakeAiAdvisor:
        def summarize_patient_history(self, current_summary, latest_consultation):
            assert current_summary == "Initial constitutional summary"
            assert latest_consultation["symptoms"] == "Insomnia worse after midnight"
            return "Updated compact summary"

    monkeypatch.setattr("app.api.v1.consultations.get_ai_advisor_service", lambda: FakeAiAdvisor())
    app.config["AI_SUMMARY_ON_SAVE"] = True
    patient = client.post(
        "/api/v1/patients",
        json={"name": "Mina", "aiSummary": "Initial constitutional summary"},
        headers=auth_headers,
    ).get_json()["data"]

    response = client.post(
        "/api/v1/consultations",
        json={"patientId": patient["id"], "symptoms": "Insomnia worse after midnight"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    patient_response = client.get(f"/api/v1/patients/{patient['id']}", headers=auth_headers)
    assert patient_response.get_json()["data"]["aiSummary"] == "Updated compact summary"
