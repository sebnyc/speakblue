require('./modules/env');
const { app, BrowserWindow, powerSaveBlocker, globalShortcut } = require('electron');
const fs = require('fs');
const basePath = process.env.BASE_PATH;

let powerSaveBlockerId;
let recover = true;
let win = null;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
      disableDialogs: true,
    },
  });

  win.loadURL('http://localhost:3200/runtime_dispositif.html');
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  globalShortcut.register('Control+R', forceReset);
  globalShortcut.register('Control+K', forceQuit);
  globalShortcut.register('Shift+Control+K', forceShutdown);
  globalShortcut.register('Shift+Control+R', forceReboot);
  createWindow();
});

app.on('window-all-closed', () => {
  if (recover === true) {
    createWindow();
  } else {
    powerSaveBlocker.stop(powerSaveBlockerId);
    globalShortcut.unregisterAll();
    app.exit(0);
  }
});

function forceQuit(skipForceExitFile) {
  recover = false;
  if (win) {
    win.destroy();
  } else {
    if (skipForceExitFile !== true) {
      fs.writeFileSync(basePath + '/Documents/GitHub/speakblue/forceExit.txt', Date.now().toString());
    }
    powerSaveBlocker.stop(powerSaveBlockerId);
    globalShortcut.unregisterAll();
    app.exit(0);
  }
}

function forceReset() {
  fs.writeFileSync(basePath + '/Documents/GitHub/speakblue/forceReset.txt', Date.now().toString());
  forceQuit(true);
}

function forceShutdown() {
  fs.writeFileSync(basePath + '/Documents/GitHub/speakblue/forceShutdown.txt', Date.now().toString());
  forceQuit(true);
}

function forceReboot() {
  fs.writeFileSync(basePath + '/Documents/GitHub/speakblue/forceReboot.txt', Date.now().toString());
  forceQuit(true);
}

app.on('before-quit', function (event) {
  app.exit(0);
  if (recover === true) {
    event.preventDefault();
  }
});

app.on('will-quit', function (event) {
  app.exit(0);
  if (recover === true) {
    event.preventDefault();
  }
});

app.on('render-process-gone', function () {
  if (win) {
    win.destroy();
  }
});

app.on('child-process-gone', function () {
  if (win) {
    win.destroy();
  }
});
