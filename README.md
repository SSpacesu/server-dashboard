# Server Dashboard

A full-stack web application for monitoring a Linux home server.

The goal of this project is to provide a clean dashboard for viewing real-time server statistics, historical performance data, and system information from a web browser.

This project is being developed as a senior capstone project.

## Features

Currently implemented:

- Live CPU usage
- Live RAM usage
- Disk usage
- System uptime
- Battery percentage
- Historical CPU and RAM data
- Performance graphs
- PostgreSQL database storage
- FastAPI backend
- Automatic server monitoring
- Automatic backend startup using systemd
- Automatic monitoring startup using systemd
- Remote server access through Tailscale
- React-based dashboard interface

Planned features:

- Server online/offline status
- Service status monitoring
- User login and authentication
- Multiple dashboard pages
- Improved historical performance views
- Production deployment of the frontend

## Architecture

The application is split into several parts:

```text
Linux Server
    |
    | system information
    v
monitor.py
    |
    | JSON over HTTP
    v
FastAPI Backend
    |
    +------> PostgreSQL
    |         historical data
    |
    v
React Frontend
    |
    v
Web Browser
