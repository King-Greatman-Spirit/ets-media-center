@echo off
set PYTHONPATH=C:\PROJECTS\ets\backend;C:\PROJECTS\ets\backend\app
cd C:\PROJECTS\ets\backend\app
python -m uvicorn main:app --port 8001 --reload
