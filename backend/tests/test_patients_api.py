from app.extensions import db
from app.models import Patient, PatientHistorySnapshot


def test_patient_crud_is_scoped_to_authenticated_doctor(client, auth_headers, other_auth_headers):
    create_response = client.post(
        "/api/v1/patients",
        json={
            "name": "Aisha Khan",
            "age": 34,
            "gender": "Female",
            "phone": "555-0100",
            "email": "aisha@example.com",
            "history": "Migraine since childhood",
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 201
    patient = create_response.get_json()["data"]
    assert patient["id"]
    assert patient["doctorId"] == "doctor-one"
    assert patient["name"] == "Aisha Khan"

    list_response = client.get("/api/v1/patients", headers=auth_headers)
    assert list_response.status_code == 200
    assert [item["name"] for item in list_response.get_json()["data"]] == ["Aisha Khan"]

    other_list_response = client.get("/api/v1/patients", headers=other_auth_headers)
    assert other_list_response.status_code == 200
    assert other_list_response.get_json()["data"] == []

    patch_response = client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"phone": "555-0111"},
        headers=auth_headers,
    )
    assert patch_response.status_code == 200
    assert patch_response.get_json()["data"]["phone"] == "555-0111"

    forbidden_delete = client.delete(f"/api/v1/patients/{patient['id']}", headers=other_auth_headers)
    assert forbidden_delete.status_code == 404

    delete_response = client.delete(f"/api/v1/patients/{patient['id']}", headers=auth_headers)
    assert delete_response.status_code == 204


def test_create_patient_requires_name(client, auth_headers):
    response = client.post("/api/v1/patients", json={"age": 40}, headers=auth_headers)

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "validation_error"


def test_search_patients_matches_name_phone_and_email(client, auth_headers):
    client.post("/api/v1/patients", json={"name": "Nadia", "phone": "111"}, headers=auth_headers)
    client.post("/api/v1/patients", json={"name": "Omar", "email": "omar@example.com"}, headers=auth_headers)

    response = client.get("/api/v1/patients?q=omar", headers=auth_headers)

    assert response.status_code == 200
    assert [patient["name"] for patient in response.get_json()["data"]] == ["Omar"]


def test_patient_status_defaults_and_transitions_to_healed_create_snapshot(app, client, auth_headers):
    patient = client.post(
        "/api/v1/patients",
        json={"name": "Leena Shah", "history": "Eczema worse in winter"},
        headers=auth_headers,
    ).get_json()["data"]

    assert patient["status"] == "active"
    assert patient["statusUpdatedAt"]
    assert patient["healedAt"] is None

    improving_response = client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"status": "improving"},
        headers=auth_headers,
    )
    assert improving_response.status_code == 200
    assert improving_response.get_json()["data"]["status"] == "improving"

    healed_response = client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"status": "healed"},
        headers=auth_headers,
    )

    assert healed_response.status_code == 200
    healed = healed_response.get_json()["data"]
    assert healed["status"] == "healed"
    assert healed["healedAt"]
    assert healed["latestHistorySnapshot"]["version"] == 1
    assert healed["latestHistorySnapshot"]["eventType"] == "marked_healed"

    with app.app_context():
        snapshots = PatientHistorySnapshot.query.filter_by(patient_id=patient["id"]).all()
        assert len(snapshots) == 1
        assert snapshots[0].version == 1
        assert snapshots[0].event_type == "marked_healed"
        assert snapshots[0].payload["patient"]["name"] == "Leena Shah"
        assert snapshots[0].payload["patient"]["status"] == "healed"
        assert snapshots[0].payload["consultations"] == []


def test_healed_patient_updates_append_snapshots_without_overwriting(app, client, auth_headers):
    patient = client.post("/api/v1/patients", json={"name": "Nadia"}, headers=auth_headers).get_json()["data"]
    client.patch(f"/api/v1/patients/{patient['id']}", json={"status": "healed"}, headers=auth_headers)

    with app.app_context():
        first_payload = PatientHistorySnapshot.query.filter_by(patient_id=patient["id"]).one().payload_json

    update_response = client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"phone": "555-0199"},
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    assert update_response.get_json()["data"]["latestHistorySnapshot"]["version"] == 2
    with app.app_context():
        snapshots = PatientHistorySnapshot.query.filter_by(patient_id=patient["id"]).order_by(PatientHistorySnapshot.version).all()
        assert [snapshot.version for snapshot in snapshots] == [1, 2]
        assert snapshots[0].payload_json == first_payload
        assert snapshots[1].event_type == "healed_patient_updated"
        assert snapshots[1].payload["patient"]["phone"] == "555-0199"


def test_consultation_for_healed_patient_appends_snapshot(app, client, auth_headers):
    patient = client.post("/api/v1/patients", json={"name": "Omar"}, headers=auth_headers).get_json()["data"]
    client.patch(f"/api/v1/patients/{patient['id']}", json={"status": "healed"}, headers=auth_headers)

    response = client.post(
        "/api/v1/consultations",
        json={
            "patientId": patient["id"],
            "symptoms": "Follow-up sleep stable",
            "prescribedRemedy": "Sulphur",
            "potency": "200C",
            "notes": "No relapse",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    with app.app_context():
        snapshots = PatientHistorySnapshot.query.filter_by(patient_id=patient["id"]).order_by(PatientHistorySnapshot.version).all()
        assert [snapshot.event_type for snapshot in snapshots] == ["marked_healed", "healed_consultation_added"]
        assert snapshots[1].payload["consultations"][0]["prescribedRemedy"] == "Sulphur"
