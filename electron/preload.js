const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keyNoiseApi', {
  appReady: () => ipcRenderer.send('key-noise:renderer-ready'),
  getSystemVolume: () => ipcRenderer.invoke('key-noise:get-system-volume'),
  setSystemVolume: (value) => ipcRenderer.invoke('key-noise:set-system-volume', value),
  selectMp3: () => ipcRenderer.invoke('key-noise:select-mp3')
});
