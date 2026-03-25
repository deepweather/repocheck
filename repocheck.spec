# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for repocheck backend binary."""

import os
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

# Collect all submodules for packages that do lazy imports
hiddenimports = (
    collect_submodules("uvicorn")
    + collect_submodules("fastapi")
    + collect_submodules("starlette")
    + collect_submodules("pydantic")
    + collect_submodules("pydantic_core")
    + collect_submodules("git")
    + collect_submodules("openai")
    + collect_submodules("httpx")
    + collect_submodules("dotenv")
    + [
        "repocheck",
        "repocheck.server",
        "repocheck.extractor",
        "repocheck.classifier",
        "repocheck.metrics",
        "repocheck.analytics",
        "repocheck.cache",
    ]
)

a = Analysis(
    ["backend_entry.py"],
    pathex=[os.path.abspath(".")],
    binaries=[],
    datas=[
        ("repocheck/static", "repocheck/static"),
        ("repocheck/__init__.py", "repocheck"),
        ("repocheck/server.py", "repocheck"),
        ("repocheck/extractor.py", "repocheck"),
        ("repocheck/classifier.py", "repocheck"),
        ("repocheck/metrics.py", "repocheck"),
        ("repocheck/analytics.py", "repocheck"),
        ("repocheck/cache.py", "repocheck"),
    ],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "PIL", "scipy", "numpy"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="repocheck-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="repocheck-backend",
)
