const { app, BrowserWindow, dialog, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let pythonProcess;

// Path to the Python backend executable
// In development, it's relative to the electron-app folder.
// In production, electron-builder packs extra files into process.resourcesPath
const backendPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'backend-bin', 'DashQ.exe')
    : path.join(__dirname, '..', 'backend', 'dist', 'DashQ.exe');

function startPythonBackend() {
    console.log("Starting Python Backend from:", backendPath);
    pythonProcess = spawn(backendPath, [], {
        cwd: path.dirname(backendPath),
        // Hide the console window on Windows
        windowsHide: true
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Backend exited with code ${code}`);
    });
}

function checkServerReady(url, timeoutMs, intervalMs) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const check = () => {
            if (Date.now() - startTime > timeoutMs) {
                reject(new Error('Timeout waiting for server to start.'));
                return;
            }

            const req = http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    setTimeout(check, intervalMs);
                }
            }).on('error', () => {
                setTimeout(check, intervalMs);
            });
            req.end();
        };
        
        check();
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false, // Hide until loaded
        autoHideMenuBar: true, // Hide the default ugly Windows menu bar
        title: "DashQ",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const targetUrl = 'http://127.0.0.1:5000';
    
    try {
        console.log("Waiting for backend to be ready...");
        await checkServerReady(targetUrl, 15000, 500); // wait up to 15s
        console.log("Backend is ready! Loading UI...");
        
        mainWindow.loadURL(targetUrl);
        
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            // Check for updates once the window is ready
            autoUpdater.checkForUpdatesAndNotify().catch(err => {
                console.log("Auto-updater error:", err);
            });
        });
        
    } catch (error) {
        console.error(error);
        dialog.showErrorBox("Error de Inicio", "No se pudo conectar con el motor interno de DashQ. Asegúrate de que el puerto 5000 no esté ocupado por otro programa.");
        app.quit();
    }
}

app.whenReady().then(() => {
    startPythonBackend();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    session.defaultSession.on('will-download', (event, item, webContents) => {
        item.setSaveDialogOptions({
            defaultPath: item.getFilename(),
            title: 'Guardar Archivo (DashQ)'
        });
    });

    // Auto updater IPC
    ipcMain.handle('check-updates', async () => {
        try {
            return await autoUpdater.checkForUpdatesAndNotify();
        } catch (e) {
            console.error(e);
            return null;
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Kill the python process when Electron quits
app.on('will-quit', () => {
    if (pythonProcess) {
        console.log("Killing Python Backend...");
        pythonProcess.kill();
    }
});
