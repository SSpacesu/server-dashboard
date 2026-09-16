from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
import psycopg
import os
import time
import psutil
#START file share imports
import re
from pathlib import Path
UPLOAD_DIRECTORY = Path("/srv/storage/shared")
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB
#END file share imports

from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("SERVER_IP"),
                   os.getenv("TAILSCALE_IP"),
                   "http://homeserverhp:5173",
                   "http://homeserverhp.lan:5173",
                   "http://hommeserverhp",
                   ],
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


#File uploads
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(""),
):
    original_name = file.filename or ""

    # Handle both Unix and Windows-style paths supplied by a client.
    basename = original_name.replace("\\", "/").split("/")[-1]

    # Preserve normal user-visible names while removing unsafe characters.
    safe_name = re.sub(r"[\x00-\x1f\x7f]", "_", basename)
    safe_name = safe_name.lstrip(".")

    if not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Limit the filename length while preserving its extension.
    suffix = Path(safe_name).suffix[:20]
    stem = Path(safe_name).stem
    max_stem_length = max(1, 240 - len(suffix))
    stored_name = f"{stem[:max_stem_length] or 'upload'}{suffix}"

    upload_root = UPLOAD_DIRECTORY.resolve()
    requested_directory = (upload_root / folder).resolve()


    #makes sure requested directory is within the upload root
    try:
        requested_directory.relative_to(upload_root)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination folder",
        ) 
    
    #confirms path exists and it is directory not a file
    if not requested_directory.is_dir():
        raise HTTPException(
            status_code=400,
            detail="Destination folder does not exist",
        )
    
    destination = requested_directory / stored_name

    # Keep the original-looking name and avoid overwriting an existing file.
    duplicate_number = 2
    while destination.exists():
        stored_name = f"{stem[:max_stem_length - len(str(duplicate_number)) - 1] or 'upload'} ({duplicate_number}){suffix}"
        destination = requested_directory / stored_name
        duplicate_number += 1


    bytes_written = 0

    try:
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)

        with destination.open("xb") as output:
            while chunk := await file.read(CHUNK_SIZE):
                bytes_written += len(chunk)

                if bytes_written > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the 100 MB upload limit",
                    )

                output.write(chunk)

    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except OSError:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="The server could not save the uploaded file",
        )
    finally:
        await file.close()

    return {
        "message": "Upload complete",
        "original_filename": original_name,
        "stored_filename": stored_name,
        "size": bytes_written,
    }

@app.get("/api/folders")
def list_folders(path: str = ""):
    upload_root = UPLOAD_DIRECTORY.resolve()
    requested_directory = (upload_root / path).resolve()

    try:
        requested_directory.relative_to(upload_root)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid folder path",
        )

    if not requested_directory.is_dir():
        raise HTTPException(
            status_code=404,
            detail="Folder does not exist",
        )

    folders = sorted(
        [
            item.name
            for item in requested_directory.iterdir()
            if item.is_dir() and not item.name.startswith(".")
        ],
        key=str.casefold,
    )

    files = sorted(
    [
        item.name
        for item in requested_directory.iterdir()
        if item.is_file() and not item.name.startswith(".")
    ],
    key=str.casefold,
    )
    return {
        "path": path,
        "folders": folders,
        "files": files,
    }

@app.get("/api/file")
def get_file(path: str, download: bool = False):
    upload_root = UPLOAD_DIRECTORY.resolve()
    requested_file = (upload_root / path).resolve()

    try:
        requested_file.relative_to(upload_root)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file path",
        )

    if not requested_file.is_file():
        raise HTTPException(
            status_code=404,
            detail="File does not exist",
        )

    if download:
        return FileResponse(
            requested_file,
            filename=requested_file.name,
        )

    return FileResponse(requested_file)