from datetime import datetime, timezone


def test_statistics_are_scoped_and_aggregate_patient_and_remedy_data(client, auth_headers, other_auth_headers):
    first_patient = client.post(
        "/api/v1/patients",
        json={"name": "Aisha Khan"},
        headers=auth_headers,
    ).get_json()["data"]
    second_patient = client.post(
        "/api/v1/patients",
        json={"name": "Ravi Sharma"},
        headers=auth_headers,
    ).get_json()["data"]
    other_patient = client.post(
        "/api/v1/patients",
        json={"name": "Other Doctor Patient"},
        headers=other_auth_headers,
    ).get_json()["data"]

    client.patch(f"/api/v1/patients/{first_patient['id']}", json={"status": "healed"}, headers=auth_headers)
    client.patch(f"/api/v1/patients/{second_patient['id']}", json={"status": "improving"}, headers=auth_headers)
    client.patch(f"/api/v1/patients/{other_patient['id']}", json={"status": "healed"}, headers=other_auth_headers)

    for patient_id, remedy, potency in (
        (first_patient["id"], "Nat Mur", "30C"),
        (first_patient["id"], "Nat Mur", "200C"),
        (second_patient["id"], "Sulphur", "30C"),
    ):
        client.post(
            "/api/v1/consultations",
            json={
                "patientId": patient_id,
                "date": datetime.now(timezone.utc).isoformat(),
                "symptoms": "Follow-up",
                "prescribedRemedy": remedy,
                "potency": potency,
            },
            headers=auth_headers,
        )
    client.post(
        "/api/v1/consultations",
        json={
            "patientId": other_patient["id"],
            "symptoms": "Other doctor follow-up",
            "prescribedRemedy": "Ignored Remedy",
            "potency": "1M",
        },
        headers=other_auth_headers,
    )

    response = client.get("/api/v1/statistics", headers=auth_headers)

    assert response.status_code == 200
    stats = response.get_json()["data"]
    assert stats["totalPatients"] == 2
    assert stats["statusCounts"]["active"] == 0
    assert stats["statusCounts"]["improving"] == 1
    assert stats["statusCounts"]["healed"] == 1
    assert stats["healedPercentage"] == 50
    assert stats["recentConsultationCount"] == 3
    assert stats["topPrescribedRemedies"] == [
        {"name": "Nat Mur", "count": 2},
        {"name": "Sulphur", "count": 1},
    ]
    assert stats["topPotencies"] == [
        {"name": "30C", "count": 2},
        {"name": "200C", "count": 1},
    ]
    assert [patient["name"] for patient in stats["recentHealedPatients"]] == ["Aisha Khan"]
