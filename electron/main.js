const { app, BrowserWindow, dialog } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const http = require("http");
const net = require("net");

let backendProcess = null;
let mainWindow = null;
let backendPort = null;

function isDev() {
  return !app.isPackaged;
}

function getBackendPath() {
  if (isDev()) {
    return path.join(__dirname, "..", "dist", "repocheck-backend", "repocheck-backend");
  }
  return path.join(process.resourcesPath, "backend", "repocheck-backend");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function waitForBackend(port, retries = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(500, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) {
        reject(new Error("Backend did not start"));
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });
}

function checkGitInstalled() {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function startBackend() {
  const binPath = getBackendPath();
  backendPort = await findFreePort();

  const env = { ...process.env, REPOCHECK_PORT: String(backendPort) };

  backendProcess = spawn(binPath, [], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  backendProcess.stdout.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on("exit", (code) => {
    console.log(`[backend] exited with code ${code}`);
    backendProcess = null;
  });

  await waitForBackend(backendPort);
}

function killBackend() {
  if (!backendProcess) return;

  try {
    backendProcess.kill("SIGTERM");
  } catch {}

  setTimeout(() => {
    if (backendProcess) {
      try { backendProcess.kill("SIGKILL"); } catch {}
    }
  }, 3000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "repocheck",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#111113",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${backendPort}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (!checkGitInstalled()) {
    dialog.showErrorBox(
      "git not found",
      "repocheck requires git to be installed.\n\nInstall it via Xcode Command Line Tools:\n  xcode-select --install"
    );
    app.quit();
    return;
  }

  try {
    await startBackend();
    createWindow();
  } catch (err) {
    dialog.showErrorBox("Failed to start", `Backend could not start:\n${err.message}`);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  killBackend();
  app.quit();
});

app.on("before-quit", () => {
  killBackend();
});

app.on("activate", () => {
  if (mainWindow === null && backendPort) {
    createWindow();
  }
});
