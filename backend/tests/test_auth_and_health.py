def test_health_check_is_public(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "ok"


def test_protected_routes_require_bearer_token(client):
    response = client.get("/api/v1/patients")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"
