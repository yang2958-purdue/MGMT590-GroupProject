import { contextBridge, ipcRenderer } from 'electron';

console.log('[preload] Starting preload script');

let backendReady = false;
const backendReadyCallbacks: Array<() => void> = [];

ipcRenderer.on('app:ready', () => {
  console.log('[preload] app:ready event received in preload');
  backendReady = true;
  backendReadyCallbacks.splice(0).forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('[preload] Error running backendReady callback:', err);
    }
  });
});

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<string | null> => {
    console.log('[preload] openFile invoked');
    return ipcRenderer.invoke('dialog:openFile');
  },
  saveFile: (type: 'docx' | 'txt' | 'csv'): Promise<string | null> => {
    console.log('[preload] saveFile invoked with type:', type);
    return ipcRenderer.invoke('dialog:saveFile', type);
  },
  getConfigPath: (): Promise<string> => {
    console.log('[preload] getConfigPath invoked');
    return ipcRenderer.invoke('app:getConfigPath');
  },
  onBackendReady: (cb: () => void): void => {
    console.log('[preload] onBackendReady handler registered');
    if (backendReady) {
      console.log('[preload] Backend already ready, invoking callback immediately');
      cb();
    } else {
      backendReadyCallbacks.push(cb);
    }
  },
  readFile: (filePath: string): Promise<ArrayBuffer> => {
    console.log('[preload] readFile invoked for path:', filePath);
    return ipcRenderer.invoke('dialog:readFile', filePath);
  },
  writeFile: (filePath: string, content: ArrayBuffer | string): Promise<void> => {
    console.log('[preload] writeFile invoked for path:', filePath);
    return ipcRenderer.invoke('dialog:writeFile', filePath, content);
  },
});
