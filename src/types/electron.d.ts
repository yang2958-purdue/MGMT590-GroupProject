export interface ElectronAPI {
  openFile: () => Promise<string | null>;
  saveFile: (type: 'docx' | 'txt' | 'csv') => Promise<string | null>;
  getConfigPath: () => Promise<string>;
  onBackendReady: (cb: () => void) => void;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, content: ArrayBuffer | string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
