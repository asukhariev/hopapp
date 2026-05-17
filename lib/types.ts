export type SessionStatus =
  | "pending_start"  // user clicked Start; runner hasn't picked up
  | "recording"      // session is live — runner acked Start
  | "pending_stop"   // user clicked Stop; runner hasn't picked up
  | "exporting"      // runner driving MR4 Export -> CSV
  | "uploading"      // runner uploading file to Vercel Blob
  | "done"           // file URL available
  | "failed";        // see `error`

export type Session = {
  id: string;
  device: "emg" | "video" | "insoles";
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  progress?: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  error?: string;
};

export type RunnerCommand =
  | { type: "start"; session_id: string; device: Session["device"] }
  | { type: "stop"; session_id: string }
  | { type: "noop" };

/**
 * Statuses where the runner is actively working — UI should show a spinner
 * and DISABLE both Start and Stop buttons.
 */
export const BUSY_STATUSES: SessionStatus[] = [
  "pending_start",
  "pending_stop",
  "exporting",
  "uploading",
];

/**
 * Statuses where the session is "live" — Stop button should be enabled,
 * Start disabled.
 */
export const LIVE_STATUSES: SessionStatus[] = ["recording"];

export const TERMINAL_STATUSES: SessionStatus[] = ["done", "failed"];
