const { app, BrowserWindow } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');

function createWindow() {
  // Load previous window state (size, position) or use defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 293,
    defaultHeight: 688
  });

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
    icon: path.join(__dirname, 'img/icon.png') // Optional: add an icon
  });

  // Let electron-window-state manage and track window size/position changes
  mainWindowState.manage(win);

  win.loadFile('index.html');

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