import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as path from 'path';
import { pythonBridge } from './pythonBridge';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV !== 'production';

function createLoadingWindow(): BrowserWindow {
  console.log('[main] Creating loading window');
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <div style="width:40px;height:40px;border:3px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <p style="margin-top:16px;">Starting JobBot...</p>
      </body>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </html>`)}`
  );
  win.webContents.on('did-finish-load', () => {
    console.log('[main] Loading window did-finish-load');
  });
  return win;
}

function createMainWindow(): BrowserWindow {
  console.log('[main] Creating main window (isDev=%s)', isDev);
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  if (isDev) {
    console.log('[main] Loading main window URL http://localhost:3000');
    win.loadURL('http://localhost:3000');
  } else {
    const filePath = path.join(__dirname, '../out/index.html');
    console.log('[main] Loading main window file', filePath);
    win.loadFile(path.join(__dirname, '../out/index.html'));
  }
  win.webContents.on('did-finish-load', () => {
    console.log('[main] Main window did-finish-load event fired');
  });
  return win;
}

function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show();
  }
}

app.whenReady().then(() => {
  console.log('[main] App whenReady fired');
  const loadingWindow = createLoadingWindow();
  loadingWindow.show();

  pythonBridge
    .start()
    .then(() => {
      console.log('[main] pythonBridge.start() resolved, creating main window');
      mainWindow = createMainWindow();
      mainWindow.once('ready-to-show', () => {
        console.log('[main] Main window ready-to-show, closing loading window and showing main window');
        loadingWindow.close();
        showMainWindow();
      });
      mainWindow.webContents.once('did-finish-load', () => {
        console.log('[main] did-finish-load once handler, sending app:ready to renderer');
        mainWindow?.webContents.send('app:ready');
      });
    })
    .catch((err) => {
      console.error('[main] pythonBridge.start() failed, closing loading window and quitting app. Error:', err);
      loadingWindow.close();
      app.quit();
    });
});

app.on('window-all-closed', () => {
  pythonBridge.stop();
  app.quit();
});

app.on('will-quit', () => {
  pythonBridge.stop();
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Resume', extensions: ['pdf', 'docx', 'doc', 'txt'] },
      { name: 'All', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_event, type: 'docx' | 'txt' | 'csv') => {
  const filters: { [k: string]: { name: string; extensions: string[] } } = {
    docx: { name: 'Word', extensions: ['docx'] },
    txt: { name: 'Text', extensions: ['txt'] },
    csv: { name: 'CSV', extensions: ['csv'] },
  };
  const result = await dialog.showSaveDialog({
    defaultPath: 'export',
    filters: [filters[type], { name: 'All', extensions: ['*'] }],
  });
  return result.canceled ? null : result.filePath ?? null;
});

ipcMain.handle('app:getConfigPath', () => {
  return path.join(app.getPath('userData'), 'config.json');
});

ipcMain.handle('dialog:readFile', async (_event, filePath: string) => {
  const fs = await import('fs/promises');
  const buf = await fs.readFile(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});

ipcMain.handle('dialog:writeFile', async (_event, filePath: string, content: Buffer | string) => {
  const fs = await import('fs/promises');
  const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
  await fs.writeFile(filePath, data);
});
