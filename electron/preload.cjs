const { contextBridge, ipcRenderer } = require("electron");
let beforeClose = async () => true;
contextBridge.exposeInMainWorld("studyflowDesktop", {
  onBeforeClose(callback) {
    beforeClose = callback;
    return () => {
      beforeClose = async () => true;
    };
  },
});
ipcRenderer.on("studyflow:prepare-close", async (_event, requestId) => {
  let saved = false;
  try {
    saved = (await beforeClose()) === true;
  } catch {}
  ipcRenderer.send("studyflow:close-prepared", requestId, saved);
});
ipcRenderer.on("studyflow:new-set", () => {
  window.location.hash = "/create";
});
