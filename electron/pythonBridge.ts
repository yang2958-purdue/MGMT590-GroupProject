import { spawn, ChildProcess } from 'child_process';
import { app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const PORT = 7823;
const HEALTH_URL = `http://localhost:${PORT}/health`;
const POLL_MS = 500;
const TIMEOUT_MS = 15000;

const PYTHON_REQUIRED_MESSAGE =
  'JobBot could not find Python. The backend requires Python 3.10 or newer.\n\n' +
  'Please install Python from https://www.python.org/downloads/ and ensure ' +
  '"Add Python to PATH" was checked during installation, then restart JobBot.';

let child: ChildProcess | null = null;

async function waitForHealth(): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

function getBackendDir(): string {
  if (app.isPackaged && process.resourcesPath) {
    const packagedBackend = path.join(process.resourcesPath, 'backend');
    if (fs.existsSync(packagedBackend)) {
      return packagedBackend;
    }
  }
  return path.resolve(__dirname, '../backend');
}

/** Resolve Python executable. In dev, prefer backend/.venv so dependencies (uvicorn, etc.) are found. */
function getPythonExecutable(backendDir: string): string {
  if (!app.isPackaged) {
    const venvPython =
      process.platform === 'win32'
        ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
        : path.join(backendDir, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPython)) return venvPython;
  }
  if (process.platform === 'win32') {
    const standardPaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python311', 'python.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python310', 'python.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python312', 'python.exe'),
    ];
    for (const exe of standardPaths) {
      try {
        if (fs.existsSync(exe)) return exe;
      } catch {
        // ignore
      }
    }
    return 'python';
  }
  return 'python3';
}

export const pythonBridge = {
  async start(): Promise<void> {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const env = { ...process.env, JOBBOT_CONFIG_PATH: configPath };
    const backendDir = getBackendDir();
    const mainPath = path.join(backendDir, 'main.py');

    if (!fs.existsSync(mainPath)) {
      const msg = `Backend not found at ${mainPath}. Run from project root.`;
      dialog.showErrorBox('JobBot', msg);
      throw new Error(msg);
    }

    const pythonExe = getPythonExecutable(backendDir);
    const isDev = !app.isPackaged;
    if (isDev) {
      const venvPath = process.platform === 'win32'
        ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
        : path.join(backendDir, '.venv', 'bin', 'python');
      if (!fs.existsSync(venvPath)) {
        const msg = 'Backend virtual environment not found. Run: cd backend && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt';
        dialog.showErrorBox('JobBot', msg);
        throw new Error(msg);
      }
      console.log('[JobBot] Backend dir:', backendDir);
      console.log('[JobBot] Python:', pythonExe);
    }

    await new Promise<void>((resolve, reject) => {
      child = spawn(pythonExe, [mainPath, '--port', String(PORT)], {
        cwd: backendDir,
        env,
        stdio: isDev ? 'inherit' : 'pipe',
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          dialog.showErrorBox('JobBot – Python required', PYTHON_REQUIRED_MESSAGE);
        } else {
          dialog.showErrorBox('JobBot Backend', `Failed to start backend: ${err.message}`);
        }
        child = null;
        reject(err);
      });

      child.on('exit', (code, signal) => {
        const exited = child;
        child = null;
        if (code != null && code !== 0 && exited !== null) {
          dialog.showErrorBox('JobBot Backend', `Python backend exited with code ${code}. Check the terminal for errors.`);
          reject(new Error(`Backend exited with code ${code}`));
        }
      });

      waitForHealth().then((ok) => {
        if (!ok) {
          if (child) {
            child.kill();
            child = null;
          }
          reject(new Error('Backend health check timed out'));
          return;
        }
        BrowserWindow.getAllWindows().forEach((w) => {
          try {
            w.webContents.send('app:ready');
          } catch {
            // loading window may not have preload
          }
        });
        resolve();
      });
    });
  },

  stop(): void {
    if (child) {
      child.kill();
      child = null;
    }
  },
};
