from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import psycopg
import os
import time
import psutil

from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.254.50:5173","http://100.94.85.86:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_stats = {}
last_saved_time = 0

def get_connection():
    return psycopg.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

@app.post("/api/stats")
def receive_stats(stats: dict):
    global latest_stats
    global last_saved_time

    latest_stats = stats

    current_time = time.time()
    ##sends these to database
    if current_time - last_saved_time >= 15:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO server_stats
                        (cpu_percent, ram_percent, disk_percent, uptime)
                    VALUES
                        (%s, %s, %s, %s)
                    """,
                    (
                        stats["cpu_percent"],
                        stats["ram_percent"],
                        stats["disk_percent"],
                        stats["uptime"]
                    )
                )

        last_saved_time = current_time

    return {"message": "Stats received"}

@app.get("/api/stats")
def get_stats():
    return latest_stats

@app.get("/api/history")
def get_history():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT timestamp, cpu_percent, ram_percent, disk_percent, uptime
                FROM server_stats
                ORDER BY timestamp DESC
                LIMIT 240
                """
            )

            rows = cur.fetchall()

    history = []

    for row in rows:
        history.append({
            "timestamp": row[0],
            "cpu_percent": row[1],
            "ram_percent": row[2],
            "disk_percent": row[3],
            "uptime": row[4]
        })

    return history

## for process list on frontend
process_cache = {}
@app.get("/api/processes")
def get_processes():
    processes = []

    current_pids = set()

    for proc in psutil.process_iter():
        try:
            pid = proc.pid
            current_pids.add(pid)

            if pid not in process_cache:
                process_cache[pid] = proc

                # starts cpu at None since it takes a sample over time
                proc.cpu_percent(None)

            cached_proc = process_cache[pid]

            processes.append({
                "pid": pid,
                "name": cached_proc.name(),
                "username": cached_proc.username(),
                "status": cached_proc.status(),
                "cmdline": " ".join(cached_proc.cmdline()),
                "cpu_percent": cached_proc.cpu_percent(None),
                "ram_percent": cached_proc.memory_percent()
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            pass

    # Remove processes that no longer exist
    for pid in list(process_cache):
        if pid not in current_pids:
            del process_cache[pid]

    return processes