const {app, BrowserWindow, nativeTheme, Menu, MenuItem, session, dialog} = require('electron');
const path = require('node:path');
const { fork } = require('node:child_process');

const fs = require("node:fs");

app.commandLine.appendSwitch('--enable-features', 'OverlayScrollbar')

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
            defaultEncoding: 'UTF-8',
        }
    })

    const ua = mainWindow.webContents.getUserAgent();
    mainWindow.webContents.setUserAgent(ua + ` Naplika/${app.getVersion()}`);
    
    mainWindow.loadFile(path.join(__dirname, '/Assets/index.html'))

    mainWindow.webContents.on('page-title-updated', (e) => {
        e.preventDefault();
        const title = mainWindow.webContents.getTitle();
        mainWindow.setTitle("Naplika - " + title);
    });
    
}

app.whenReady().then(async () => {
    createWindow();
    
    nativeTheme.themeSource = 'dark';
    nativeTheme.shouldUseDarkColors = true;

    Menu.setApplicationMenu(menuBar);

    const blacklist = [
        "elastic-apm-rum.umd.min.js",
        "rum-agent.min.js",
        "analytics.js",
        "gtag/js"
    ];

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = new URL(details.url);
        const pathname = url.pathname.split('?')[0];

        if (blacklist.some(entry => pathname.includes(entry))) {
            callback({cancel: true});
        } else {
            callback({});
        }
    });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = details.responseHeaders;
        delete headers['Content-Security-Policy'];
        delete headers['content-security-policy']
        delete headers['X-Content-Security-Policy'];
        
        callback({ responseHeaders: headers });
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
    
    fork(path.join(__dirname, 'server.js'), [app.getPath('userData')]);
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})