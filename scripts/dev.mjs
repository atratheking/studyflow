import { spawn } from "node:child_process";
import electronPath from "electron";
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { stdio: "inherit" },
);
let electron;
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch("http://127.0.0.1:5173")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
electron = spawn(electronPath, ["."], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, STUDYFLOW_DEV: "1" },
});
electron.on("exit", () => vite.kill());
process.on("SIGINT", () => {
  electron.kill();
  vite.kill();
});
