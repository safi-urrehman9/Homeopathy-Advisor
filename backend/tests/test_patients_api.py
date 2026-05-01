from app.extensions import db
from app.models import Patient


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
