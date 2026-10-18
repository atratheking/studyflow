const {
  app,
  BrowserWindow,
  Menu,
  protocol,
  net,
  session,
  ipcMain,
  dialog,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "studyflow",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
if (process.env.STUDYFLOW_TEST_DATA)
  app.setPath("userData", process.env.STUDYFLOW_TEST_DATA);
let quitting = false;
app.on("before-quit", () => {
  quitting = true;
});
function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 760,
    minHeight: 600,
    title: "StudyFlow",
    backgroundColor: "#0a092b",
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 20, y: 19 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  win.once("ready-to-show", () => win.show());
  let loaded = false,
    allowClose = false,
    pendingClose = false,
    requestId = 0,
    closeTimer;
  win.webContents.on("did-finish-load", () => {
    loaded = true;
  });
  win.webContents.on("render-process-gone", () => {
    allowClose = true;
  });
  function closeNow() {
    allowClose = true;
    win.close();
    if (quitting) app.quit();
  }
  function onPrepared(event, id, saved) {
    if (event.sender !== win.webContents || !pendingClose || id !== requestId)
      return;
    const url = event.senderFrame?.url ?? "";
    if (
      !url.startsWith("studyflow://app/") &&
      !(
        process.env.STUDYFLOW_DEV === "1" &&
        url.startsWith("http://127.0.0.1:5173/")
      )
    )
      return;
    clearTimeout(closeTimer);
    pendingClose = false;
    if (saved === true) closeNow();
    else {
      quitting = false;
      dialog.showMessageBox(win, {
        type: "error",
        message: "Your latest changes could not be saved.",
        detail:
          "Keep StudyFlow open and export a backup from Settings before closing.",
        buttons: ["Keep open"],
      });
    }
  }
  ipcMain.on("studyflow:close-prepared", onPrepared);
  win.on("close", (event) => {
    if (allowClose || !loaded || win.webContents.isDestroyed()) return;
    event.preventDefault();
    if (pendingClose) return;
    pendingClose = true;
    requestId++;
    win.webContents.send("studyflow:prepare-close", requestId);
    closeTimer = setTimeout(async () => {
      if (!pendingClose || win.isDestroyed()) return;
      const { response } = await dialog.showMessageBox(win, {
        type: "question",
        message: "StudyFlow is still saving.",
        detail:
          "Keep the app open to protect your latest changes, or close without saving.",
        buttons: ["Keep open", "Close without saving"],
        defaultId: 0,
        cancelId: 0,
      });
      if (!pendingClose || win.isDestroyed()) return;
      pendingClose = false;
      if (response === 1) closeNow();
      else quitting = false;
    }, 10000);
  });
  win.on("closed", () => {
    clearTimeout(closeTimer);
    ipcMain.removeListener("studyflow:close-prepared", onPrepared);
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (
      !url.startsWith("studyflow://app/") &&
      !(
        process.env.STUDYFLOW_DEV === "1" &&
        url.startsWith("http://127.0.0.1:5173/")
      )
    )
      event.preventDefault();
  });
  if (process.env.STUDYFLOW_DEV === "1") win.loadURL("http://127.0.0.1:5173");
  else win.loadURL("studyflow://app/index.html");
}
app.whenReady().then(() => {
  protocol.handle("studyflow", (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "app")
      return new Response("Not found", { status: 404 });
    let relative;
    try {
      relative = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const root = path.join(__dirname, "../dist");
    const file = path.resolve(root, "." + relative);
    if (file !== root && !file.startsWith(root + path.sep))
      return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: "StudyFlow",
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New study set",
          accelerator: "CmdOrCtrl+N",
          click: () =>
            BrowserWindow.getFocusedWindow()?.webContents.send("new-set"),
        },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(process.platform === "darwin" ? [{ role: "front" }] : []),
      ],
    },
  ];
  template.find((m) => m.label === "File").submenu[0].click = () =>
    BrowserWindow.getFocusedWindow()?.webContents.send("studyflow:new-set");
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
