const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');

function createWindow() {
  // Load previous window state (size, position) or use defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 293,
    defaultHeight: 688
  });

  // Determine icon path based on platform
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'assets/app_icon.ico');
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets/icon_512x512.png'); // macOS uses PNG
  } else {
    iconPath = path.join(__dirname, 'assets/icon_512x512.png'); // Linux uses PNG
  }

  const win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true, // Hides the menu bar
    icon: iconPath
  });

  // Let electron-window-state manage and track window size/position changes
  mainWindowState.manage(win);

  win.loadFile('index.html');

  // Open external links in default browser instead of Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external links
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Optional: Open DevTools for debugging
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});