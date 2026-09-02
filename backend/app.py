from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
app=FastAPI(title="SpendWise API")
DB="../database/spendwise.db"
class Transaction(BaseModel):
    name:str; type:str; category:str; amount:float; date:str
@app.get("/api/health")
def health(): return {"status":"online"}
@app.get("/api/transactions")
def transactions():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row
    rows=c.execute("SELECT * FROM transactions ORDER BY id DESC").fetchall(); c.close()
    return [dict(r) for r in rows]
@app.post("/api/transactions")
def add(t:Transaction):
    c=sqlite3.connect(DB); cur=c.execute("INSERT INTO transactions(name,type,category,amount,date) VALUES(?,?,?,?,?)",(t.name,t.type,t.category,t.amount,t.date)); c.commit(); out={"id":cur.lastrowid,**t.model_dump()}; c.close(); return out
