from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import date as Date
from pathlib import Path
from typing import Iterator, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATABASE_PATH = PROJECT_ROOT / "database" / "spendwise.db"
SCHEMA_PATH = PROJECT_ROOT / "database" / "schema.sql"

app = FastAPI(title="SpendWise API", version="1.1.0")


class Transaction(BaseModel):
    """Validated transaction payload accepted by the API."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=40)
    amount: float = Field(gt=0, allow_inf_nan=False)
    date: str = Field(min_length=10, max_length=10)

    @field_validator("date")
    @classmethod
    def validate_iso_date(cls, value: str) -> str:
        try:
            parsed = Date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Date must be a valid YYYY-MM-DD calendar date.") from exc
        if parsed.isoformat() != value:
            raise ValueError("Date must use YYYY-MM-DD format.")
        return value


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    """Open a short-lived SQLite connection and always close it."""
    connection = sqlite3.connect(DATABASE_PATH, timeout=5)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    """Create the database file and apply the idempotent schema."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with database_connection() as connection:
        connection.executescript(schema)


initialize_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    try:
        with database_connection() as connection:
            connection.execute("SELECT 1").fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc
    return {"status": "online", "database": "reachable"}


@app.get("/api/transactions")
def transactions() -> list[dict]:
    with database_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM transactions ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/transactions", status_code=201)
def add_transaction(transaction: Transaction) -> dict:
    payload = transaction.model_dump()
    with database_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO transactions (name, type, category, amount, date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload["name"],
                payload["type"],
                payload["category"],
                payload["amount"],
                payload["date"],
            ),
        )
        transaction_id = cursor.lastrowid
    return {"id": transaction_id, **payload}
