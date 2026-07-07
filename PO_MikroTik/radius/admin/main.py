from fastapi import FastAPI, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from typing import Optional

app = FastAPI()

templates = Jinja2Templates(directory="templates")

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres"),
        database=os.getenv("DB_NAME", "radius"),
        user=os.getenv("DB_USER", "radius"),
        password=os.getenv("POSTGRES_PASSWORD", "radpass")
    )

@app.get("/", response_class=HTMLResponse)
async def list_users(request: Request):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users ORDER BY id ASC")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return templates.TemplateResponse("index.html", {"request": request, "users": users})

@app.post("/add")
async def add_user(
    username: str = Form(...),
    password: str = Form(""),
    mac: Optional[str] = Form(None),
    rate_limit: Optional[str] = Form(None)
):
    conn = get_db_connection()
    cur = conn.cursor()
    # Basic check for existing username
    try:
        cur.execute(
            "INSERT INTO users (username, password, mac, enabled, rate_limit) VALUES (%s, %s, %s, true, %s)",
            (username, password, mac, rate_limit)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error adding user: {e}")
    finally:
        cur.close()
        conn.close()
    return RedirectResponse(url="/", status_code=303)

@app.post("/delete/{username}")
async def delete_user(username: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()
    return RedirectResponse(url="/", status_code=303)

@app.post("/toggle/{username}")
async def toggle_user(username: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET enabled = NOT enabled WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()
    return RedirectResponse(url="/", status_code=303)
