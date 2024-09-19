const { app, BrowserWindow, ipcMain, nativeTheme, Menu, MenuItem, session, dialog } = require('electron');
const { machineIdSync } = require('node-machine-id');

let Store;
let store;
const initializeStore = async () => {
    const electronStore = await import('electron-store');
    Store = electronStore.default;
    store = new Store({ encryptionKey: machineIdSync(), clearInvalidConfig: true });
    
    if (!store.has('accounts')) {
        store.set('accounts', []);
    }
}

const path = require('node:path');
const fs = require("node:fs");

let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
    app.quit();
}

async function dataDelDialog() {
    const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Adatok törlése',
        message: 'Figyelmeztetés!\nAz összes adat törlődni fog a Naplikából.\nBiztosan folytatni szeretnéd?',
        buttons: ['Nem', 'Igen']
    });
    if (result.response === 1) {
        await fs.unlinkSync(path.join(app.getPath('userData'), 'config.json'));
        await session.defaultSession.clearData();
        app.relaunch();
        app.quit();
    }
}

const menuBar = new Menu();
menuBar.append(new MenuItem({
    label: 'Naplika',
    submenu: [
        {
            label: 'Kezdőképernyő',
            click: () => {
                BrowserWindow.getAllWindows().forEach(window => {
                    window.loadFile(path.join(__dirname, '/Assets/index.html'));
                });
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Kilépés',
            role: 'quit'
        }
    ]
}));
menuBar.append(new MenuItem({
    label: 'Szerkesztés',
    submenu: [
        {
            label: 'Másolás',
            role: 'copy'
        },
        {
            label: 'Kivágás',
            role: 'cut'
        },
        {
            label: 'Beillesztés',
            role: 'paste'
        },
        {
            type: 'separator'
        },
        {
            label: 'Visszavonás',
            role: 'undo'
        },
        {
            label: 'Újra',
            role: 'redo'
        },
        {
            type: 'separator'
        },
        {
            label: 'Összes kijelölése',
            role: 'selectall'
        },
        {
            label: 'Törlés',
            role: 'delete'
        }
    ]
}));
menuBar.append(new MenuItem({
    label: "Nézet",
    submenu: [
        {
            label: "Frissítés",
            role: "reload"
        },
        {
            label: "Kényszerített Frissítés",
            role: "forcereload"
        },
        {
            type: "separator"
        },
        {
            label: "100%",
            role: "resetZoom"
        },
        {
            label: "Nagyítás",
            role: "zoomIn"
        },
        {
            label: "Kicsinyítés",
            role: "zoomOut"
        },
        {
            type: "separator"
        },
        {
            label: "Teljes Képernyő",
            role: "togglefullscreen"
        },
        {
            label: "Fejlesztői Eszközök",
            role: "toggleDevTools"
        }
    ]
}));
menuBar.append(new MenuItem({
    label: "Ablak",
    submenu: [
        {
            label: "Minimizálás",
            role: "minimize"
        },
        {
            label: "Bezárás",
            role: "quit"
        }
    ]
}));
menuBar.append(new MenuItem({
    label: "Súgó",
    submenu: [
        {
            label: "Adatok törlése",
            click: () => {
                dataDelDialog();
            }
        }
    ]
}));

const createWindow = () => {

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'bridge.js'),
            contextIsolation: true,
            enableBlinkFeatures: 'OverlayScrollbars',
            defaultEncoding: 'UTF-8',
        }
    })

    mainWindow.loadFile(path.join(__dirname, '/Assets/index.html'))
    
    mainWindow.webContents.on('page-title-updated', (e) => {
        e.preventDefault();
        const title = mainWindow.webContents.getTitle();
        mainWindow.setTitle("Naplika - " + title);
    });
}

app.whenReady().then(async () => {
    await initializeStore();
    createWindow();

    nativeTheme.themeSource = 'dark';
    nativeTheme.shouldUseDarkColors = true;
    
    Menu.setApplicationMenu(menuBar);
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-store-data', async (event, key) => {
    return store.get(key);
});
ipcMain.handle('set-store-data', async (event, key, value) => {
    return store.set(key, value);
});