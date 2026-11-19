import importlib

import pytest
from fastapi.testclient import TestClient

api = importlib.import_module("backend.app")


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "DATABASE_PATH", tmp_path / "spendwise-test.db")
    api.initialize_database()
    with TestClient(api.app) as test_client:
        yield test_client


def test_health_checks_database_connectivity(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "online", "database": "reachable"}


def test_create_and_list_transaction(client):
    payload = {
        "name": "Monthly salary",
        "type": "income",
        "category": "Salary",
        "amount": 42000,
        "date": "2026-11-19",
    }

    created = client.post("/api/transactions", json=payload)
    listed = client.get("/api/transactions")

    assert created.status_code == 201
    assert created.json()["name"] == payload["name"]
    assert created.json()["amount"] == payload["amount"]
    assert len(listed.json()) == 1
    assert listed.json()[0]["type"] == "income"


@pytest.mark.parametrize(
    "changes",
    [
        {"name": "   "},
        {"type": "transfer"},
        {"category": " "},
        {"amount": 0},
        {"amount": -10},
        {"amount": float("nan")},
        {"date": "2026-02-30"},
        {"date": "19-11-2026"},
        {"unexpected": "not accepted"},
    ],
)
def test_rejects_invalid_transaction_payloads(client, changes):
    payload = {
        "name": "Groceries",
        "type": "expense",
        "category": "Food",
        "amount": 250,
        "date": "2026-11-19",
    }
    payload.update(changes)

    response = client.post("/api/transactions", json=payload)

    assert response.status_code == 422
    assert client.get("/api/transactions").json() == []


def test_database_path_does_not_depend_on_the_working_directory():
    from pathlib import Path

    expected = Path(api.__file__).resolve().parents[1] / "database" / "spendwise.db"
    assert api.DATABASE_PATH == expected
