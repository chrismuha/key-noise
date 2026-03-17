const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('templateApi', {
  selectTemplate: () => ipcRenderer.invoke('select-template'),
  generateFilledDocx: (payload) => ipcRenderer.invoke('generate-filled-docx', payload)
});
