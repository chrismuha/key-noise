const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keyNoiseApi', {
  appReady: () => ipcRenderer.send('key-noise:renderer-ready')
});
