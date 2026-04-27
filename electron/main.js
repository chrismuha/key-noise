const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splashWindow = null;
let splashShownAt = 0;
let mainWindowRevealed = false;

function getAppIconPath() {
  const iconFileNameByPlatform = {
    darwin: 'icon.icns',
    win32: 'icon.ico',
    linux: 'icon.png'
  };

  return path.join(app.getAppPath(), 'build', iconFileNameByPlatform[process.platform] || 'icon.png');
}

function getDockIconImage() {
  const image = nativeImage.createFromPath(path.join(app.getAppPath(), 'build', 'icon.png'));
  return image.isEmpty() ? undefined : image;
}

function getSplashIconDataUrl() {
  const iconPath = path.join(app.getAppPath(), 'build', 'icon.png');
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? '' : image.toDataURL();
}

function getSplashDelay() {
  const minimumVisibleDuration = 5000;
  const elapsed = Date.now() - splashShownAt;

  return Math.max(0, minimumVisibleDuration - elapsed);
}

function closeSplashWindow(forceImmediate = false) {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    return;
  }

  const delay = forceImmediate ? 0 : getSplashDelay();
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    splashWindow = null;
  }, delay);
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

  splashShownAt = Date.now();
  const appIconPath = getAppIconPath();
  const splash = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    center: true,
    backgroundColor: '#111111',
    ...(fs.existsSync(appIconPath) ? { icon: appIconPath } : {}),
    webPreferences: {
      sandbox: true
    }
  });

  const splashIconDataUrl = getSplashIconDataUrl();
  const splashHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Key Noise</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 42%),
              linear-gradient(160deg, #252525 0%, #101010 100%);
            color: #f5f5f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            overflow: hidden;
          }
          .splash {
            display: grid;
            justify-items: center;
            gap: 15px;
            text-align: center;
          }
          .mark {
            width: 104px;
            height: 104px;
            display: grid;
            place-items: center;
            filter: drop-shadow(0 22px 28px rgba(0,0,0,0.34));
          }
          .document-icon {
            display: block;
            width: 104px;
            height: 104px;
          }
          h1 {
            margin: 0;
            font-size: 27px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: 0;
          }
          p {
            margin: 0;
            color: rgba(245,245,246,0.7);
            font-size: 14px;
          }
          .loader {
            width: 168px;
            height: 5px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255,255,255,0.14);
            position: relative;
            margin-top: 5px;
          }
          .loader::after {
            content: "";
            position: absolute;
            inset: 0;
            width: 44%;
            border-radius: inherit;
            background: linear-gradient(90deg, #246bfe, #85adff);
            animation: loading 1.08s ease-in-out infinite;
          }
          @keyframes loading {
            from { transform: translateX(-120%); }
            to { transform: translateX(260%); }
          }
        </style>
      </head>
      <body>
        <div class="splash">
          <div class="mark" aria-hidden="true">
            <img class="document-icon" src="${splashIconDataUrl}" alt="" />
          </div>
          <h1>Key Noise</h1>
          <p>Preparing sound pads...</p>
          <div class="loader" aria-hidden="true"></div>
        </div>
      </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  splash.once('ready-to-show', () => {
    splash.show();
  });
  splash.on('closed', () => {
    if (splashWindow === splash) splashWindow = null;
  });

  splashWindow = splash;
  return splash;
}

function revealMainWindow() {
  if (mainWindowRevealed) return;
  mainWindowRevealed = true;

  const delay = splashWindow ? getSplashDelay() : 0;
  setTimeout(() => {
    closeSplashWindow(true);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  }, delay);
}

function createWindow() {
  mainWindowRevealed = false;
  const appIconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: '#111111',
    show: false,
    ...(fs.existsSync(appIconPath) ? { icon: appIconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererReadyHandler = (event) => {
    if (mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents) {
      revealMainWindow();
    }
  };

  ipcMain.on('key-noise:renderer-ready', rendererReadyHandler);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.once('did-fail-load', revealMainWindow);

  mainWindow.on('closed', () => {
    ipcMain.removeListener('key-noise:renderer-ready', rendererReadyHandler);
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const appIcon = getDockIconImage();
  if (process.platform === 'darwin' && appIcon && app.dock) {
    app.dock.setIcon(appIcon);
  }

  createSplashWindow();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    createWindow();
  }
});
