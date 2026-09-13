# Home Server Dashboard + NAS

A full-stack web application for monitoring a Linux home server and accessing private file storage from a web browser.

The project combines live system statistics, historical performance data, process monitoring, and a browser-based NAS interface. It is being developed as a senior capstone project and is intended for use on a trusted home network or through Tailscale.

> [!IMPORTANT]
> User authentication is not implemented yet. Do not expose the backend or frontend directly to the public internet.

## Features

### Server monitoring

- Live CPU usage and CPU temperature
- Live RAM usage with used and total memory
- Sortable running-process table with CPU and RAM usage
- Disk usage with used and total space
- System uptime
- Battery percentage and charging status
- Historical CPU and RAM graphs
- PostgreSQL storage for historical statistics
- Automatic monitoring and backend startup using systemd
- Remote access through Tailscale

### NAS and file storage

- Browse files and existing folders under `/srv/storage/shared`
- Navigate with folder breadcrumbs and back controls
- Select or drag and drop multiple files for upload
- Review and remove files from the upload queue before uploading
- Track completed files during a multi-file upload
- Preview common image formats in the browser
- Download stored files
- Stream uploads in 1 MB chunks
- Enforce a 100 MB limit per uploaded file
- Sanitize uploaded filenames and add unique prefixes to prevent overwrites
- Reject file requests and upload destinations outside the shared storage directory

### Frontend

- React and Vite interface
- React Router navigation
- Dashboard, RAM details, Storage, and Settings routes
- Backend connections based on the current browser hostname
- Responsive storage interface with clear upload and error states

## Architecture

```text
Linux system information
          |
          v
      monitor.py
          |
          | JSON over HTTP
          v
    FastAPI backend <--------> PostgreSQL
          |                    historical statistics
          |
          +------------------> /srv/storage/shared
          |                    NAS files and folders
          v
    React frontend
          |
          v
      Web browser
```

`monitor.py` collects system information and sends a snapshot to the FastAPI backend. The backend serves the latest statistics, saves historical samples to PostgreSQL, reports running processes, and handles storage requests. The React frontend polls these endpoints and presents the information through separate dashboard and storage views.

## Requirements

- Linux server
- Python 3
- PostgreSQL
- Node.js and npm
- Tailscale or a trusted local network for remote access

## Setup

### Backend

Create a Python virtual environment and install the dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the project directory with the PostgreSQL connection details:

```dotenv
DB_NAME=server_dashboard
DB_USER=server_dashboard
DB_PASSWORD=your-password
DB_HOST=127.0.0.1
DB_PORT=5432
```

Create the shared storage directory and give the user running the backend permission to access it:

```bash
sudo mkdir -p /srv/storage/shared
sudo chown -R "$USER":"$USER" /srv/storage/shared
```

Run the backend from the project directory:

```bash
uvicorn backend:app --host 0.0.0.0 --port 8000
```

### Frontend

Install the frontend packages and start the development server:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://YOUR-SERVER-HOSTNAME-OR-IP:5173` in a browser. The frontend automatically sends API requests to port `8000` on the same hostname used to open the site.

If the frontend is opened from a new hostname or IP address, add its full origin to the `allow_origins` list in `backend.py`.

## Current storage safeguards

- Storage requests are resolved and checked against `/srv/storage/shared`.
- Uploaded filenames are reduced to conservative characters.
- Unique filename prefixes prevent an upload from replacing an existing file.
- Uploads are written in chunks instead of being loaded entirely into memory.
- Incomplete files are removed when an upload fails or exceeds the size limit.
- Hidden files and folders are excluded from storage listings.
- File deletion, renaming, and folder creation are not currently available.

These safeguards restrict file access but do not replace authentication. Keep the application limited to Tailscale or a trusted LAN.

## Planned features

- Server online/offline status
- Service status monitoring
- User login and authentication
- File deletion, renaming, and folder creation
- Improved historical performance views
- Production deployment of the frontend
