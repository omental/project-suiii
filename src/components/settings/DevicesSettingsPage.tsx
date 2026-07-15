"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsChrome } from "@/components/settings/SettingsChrome";
import { fetchDevices, renameDevice, revokeDevice, userFacingApiError } from "@/lib/apiClient";
import { readSyncQueue } from "@/lib/syncQueue";
import type { SyncDevice } from "@/types/sync";

export function DevicesSettingsPage() {
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const queue = readSyncQueue();
  const load = useCallback(() => {
    fetchDevices(queue.deviceId).then(setDevices).catch((err) => setError(userFacingApiError(err)));
  }, [queue.deviceId]);
  useEffect(load, [load]);
  const revoke = async (device: SyncDevice) => {
    if (!window.confirm("Revoke this sync device? Server records and local browser data will not be deleted.")) return;
    try {
      const next = await revokeDevice(device.device_id, device.current);
      setDevices((current) => current.map((item) => item.id === next.id ? next : item));
      setMessage("Device revoked.");
    } catch (err) {
      setError(userFacingApiError(err));
    }
  };
  return (
    <SettingsChrome title="Devices & Sessions">
      <div className="grid gap-4">
        <p className="card p-4 text-suii-muted">Sync devices identify local data queues. Browser sessions are separate HTTP-only authentication cookies; token values are never shown here.</p>
        {devices.map((device) => (
          <section key={device.id} className="card p-4">
            <p className="display text-2xl">{device.device_name}{device.current ? " · Current" : ""}</p>
            <p className="text-sm text-suii-muted">Device {device.device_id_display}</p>
            <p className="mt-2 text-sm text-suii-muted">First seen {new Date(device.first_seen_at).toLocaleString()} · Last seen {new Date(device.last_seen_at).toLocaleString()}</p>
            <p className="text-sm text-suii-muted">Last sync {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString() : "not yet"}</p>
            {device.revoked_at ? <p className="mt-2 text-suii-amber">Revoked {new Date(device.revoked_at).toLocaleString()}</p> : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="focus-ring rounded-lg border border-white/15 px-3 py-3 display" onClick={() => {
                  const name = window.prompt("Device name", device.device_name);
                  if (name) void renameDevice(device.device_id, name).then(load);
                }}>Rename</button>
                <button className="focus-ring rounded-lg border border-suii-amber px-3 py-3 display text-suii-amber" onClick={() => void revoke(device)}>Revoke</button>
              </div>
            )}
          </section>
        ))}
        {!devices.length ? <p className="card p-4 text-suii-muted">No registered sync devices yet.</p> : null}
        <p aria-live="polite" role={error ? "alert" : "status"} className={error ? "text-suii-amber" : "text-suii-lime"}>{error || message}</p>
      </div>
    </SettingsChrome>
  );
}
