#!/usr/bin/env python3
"""Headless backend entry point for the Electron desktop app.

Starts the FastAPI server on 127.0.0.1 with the port from
REPOCHECK_PORT env var (default 8484). No browser, no CLI output.
"""

import os
import logging

import uvicorn
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/.repocheck/.env"))
load_dotenv()

logging.basicConfig(level=logging.WARNING)

port = int(os.environ.get("REPOCHECK_PORT", "8484"))
uvicorn.run("repocheck.server:app", host="127.0.0.1", port=port, log_level="warning")
