def test_health_check_is_public(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "ok"


def test_protected_routes_require_bearer_token(client):
    response = client.get("/api/v1/patients")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_doctor_can_login_and_fetch_profile(client):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "one@example.com", "password": "password123"},
    )

    assert login_response.status_code == 200
    payload = login_response.get_json()["data"]
    assert payload["token"]
    assert payload["doctor"]["email"] == "one@example.com"

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {payload['token']}"})

    assert me_response.status_code == 200
    assert me_response.get_json()["data"]["name"] == "Dr One"


def test_doctor_can_register(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Dr Three", "email": "three@example.com", "password": "password123"},
    )

    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["token"]
    assert payload["doctor"]["email"] == "three@example.com"
