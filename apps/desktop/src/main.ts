/**
 * Lemne desktop app: runs the game server on this computer and opens the TV screen in its
 * own window. Phones on the same Wi-Fi join through the QR code in the lobby.
 */
import path from 'node:path';
import { app, BrowserWindow, dialog, powerSaveBlocker, shell } from 'electron';
import type { RunningServer, startServer as StartServer } from '../../server/src/server';
import { ro } from '../../web/src/i18n/ro';

const PREFERRED_PORT = 3000;
// Same as --color-stage, so the window doesn't flash white before the page paints.
const STAGE_BACKGROUND = '#17110e';

// Packaged: content/ and the web build sit in resources/. From source: use the repo.
const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, '../../..');
process.env.NODE_ENV = 'production';
process.env.LEMNE_CONTENT_DIR = path.join(root, 'content');
process.env.LEMNE_WEB_DIST = app.isPackaged ? path.join(root, 'web') : path.join(root, 'apps/web/dist');

let server: RunningServer | null = null;

if (!app.requestSingleInstanceLock()) {
  // A second launch just focuses the running game instead of starting another server.
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win?.isMinimized()) win.restore();
    win?.focus();
  });
  app.whenReady().then(launch).catch(fail);
}

async function launch(): Promise<void> {
  // Required only now, after the LEMNE_* paths above are set.
  const { startServer } = require('./server.cjs') as { startServer: typeof StartServer };
  server = await startServer({
    port: PREFERRED_PORT,
    serveWeb: true,
    anyPortIfBusy: true,
    logLevel: 'warn',
  });

  // The TV must never dim or sleep mid-game.
  powerSaveBlocker.start('prevent-display-sleep');

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    title: ro.appName,
    backgroundColor: STAGE_BACKGROUND,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
  });
  win.maximize();
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  // F11 like a browser; Esc leaves fullscreen.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Escape' && win.isFullScreen())) {
      win.setFullScreen(input.key === 'F11' ? !win.isFullScreen() : false);
      event.preventDefault();
    }
  });
  await win.loadURL(`http://localhost:${server.port}/`);
}

app.on('window-all-closed', () => {
  void (server?.close() ?? Promise.resolve()).finally(() => app.quit());
});

function fail(err: unknown): void {
  dialog.showErrorBox(ro.desktop.startFailed, err instanceof Error ? err.message : String(err));
  app.quit();
}
