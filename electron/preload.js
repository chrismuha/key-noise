const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('templateApi', {
  appReady: () => ipcRenderer.send('docx-filler:renderer-ready'),
  selectTemplate: () => ipcRenderer.invoke('select-template'),
  generateFilledDocx: (payload) => ipcRenderer.invoke('generate-filled-docx', payload)
});
