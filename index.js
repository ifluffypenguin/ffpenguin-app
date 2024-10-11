const { app, BrowserWindow, Menu, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const discordRPC = require('discord-rpc');
const path = require('path');

if (app.requestSingleInstanceLock()) {
  const rpcClient = new discordRPC.Client({ transport: 'ipc' });

  const createMenu = () => {
    const menu = Menu.getApplicationMenu();
    const viewMenu = menu.items.find(item => item.role === 'viewmenu');
    if (viewMenu) {
      const filteredItems = viewMenu.submenu.items;
      Menu.setApplicationMenu(Menu.buildFromTemplate(filteredItems));
    }
  };

  const initializePresence = () => {
    rpcClient
      .on("ready", () => {
        rpcClient.setActivity({
          startTimestamp: Date.now(),
          instance: true,
        });
      })
      .login({ clientId: '452856594900713472' })
      .catch((error) => {
        console.error(error);
      });
  };

  const createWindow = () => {
    const mainWindowState = windowStateKeeper({
      defaultWidth: 1060,
      defaultHeight: 750,
    });

    const mainWindow = new BrowserWindow({
      ...mainWindowState,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        plugins: true,
      },
    });

    // Show the main window when it's ready and start discord rpc
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      initializePresence();
    });

    // Open external links in the user's default browser
    mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });

    // Display context menu
    mainWindow.webContents.on('context-menu', (_event, params) => {
      Menu.getApplicationMenu().popup(mainWindow, params.x, params.y);
    });

    // Load the URL into the main window and add custom user-agent
    mainWindow.loadURL('https://play.fluffyp.ninja', {
      userAgent: mainWindow.webContents.getUserAgent() + ' FluffyPenguin/' + app.getVersion(),
    });

    // Manage window state
    mainWindowState.manage(mainWindow);
  };

  const initializeFlashPlugin = () => {
    let pluginName;
    switch (process.platform) {
      case 'win32':
        pluginName = app.isPackaged ? 'pepflashplayer.dll' : 'win/x64/pepflashplayer.dll';
        break;
      case 'darwin':
        pluginName = 'PepperFlashPlayer.plugin';
        break;
      default:
        pluginName = 'libpepflashplayer.so';
    }

    const resourcesPath = app.isPackaged ? process.resourcesPath : __dirname;

    if (['freebsd', 'linux', 'netbsd', 'openbsd'].includes(process.platform)) {
      app.commandLine.appendSwitch('no-sandbox');
    }

    app.commandLine.appendSwitch('ppapi-flash-path', path.join(resourcesPath, 'plugins', pluginName));
    app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.465');
  };

  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  initializeFlashPlugin();

  app.whenReady().then(() => {
    createMenu();
    createWindow();
    autoUpdater.checkForUpdates();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
} else {
  app.quit();
}
