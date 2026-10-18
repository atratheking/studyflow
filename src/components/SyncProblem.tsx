import { useState } from "react";
import { getState, storageStatus, retrySave, reloadCloud } from "../core/store";
import { download } from "../core/import";
export function SyncProblem() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="sync-problem"
      role="alertdialog"
      aria-modal="true"
      aria-label="Cloud save needs attention"
    >
      <p>{message || storageStatus().error}</p>
      <div className="row gap wrap">
        <button
          className="button secondary"
          autoFocus
          onClick={() =>
            download(
              "StudyFlow-pending-recovery.json",
              JSON.stringify(getState(), null, 2),
            )
          }
        >
          Export pending changes
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void run(retrySave)}
        >
          Retry saving
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          Load cloud copy
        </button>
      </div>
      {confirm && (
        <div>
          <p>
            Loading the cloud copy discards pending changes on this device.
            Export them first if you want to keep them.
          </p>
          <div className="row gap">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await reloadCloud();
                  setConfirm(false);
                })
              }
            >
              Discard pending and load
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
