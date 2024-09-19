const { contextBridge, ipcRenderer } = require('electron')

const startPage = "/Assets/index.html";

let localPage = false;

window.addEventListener('DOMContentLoaded', () => {
    if (window.location.href.endsWith(startPage) && window.location.protocol === 'file:') {
        localPage = true;
    } else {
        localPage = false;
    }
})

async function getAccounts() {
    if (!localPage) { return; }
    return ipcRenderer.invoke('get-store-data', 'accounts');
}

contextBridge.exposeInMainWorld('electronAPI', {
    getStoreData: (key) => ipcRenderer.invoke('get-store-data', key),
    setStoreData: (key, value) => ipcRenderer.invoke('set-store-data', key, value),
    getAccounts: () => getAccounts()
});