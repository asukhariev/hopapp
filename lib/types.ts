export type SessionStatus =
  | "pending_start"  // user clicked Start in UI, runner hasn't picked it up yet
  | "recording"      // runner has acknowledged; technician is recording in MR4
  | "pending_stop"   // user clicked Stop; runner hasn't picked it up yet
  | "exporting"      // runner is driving MR4 Export -> CSV
  | "uploading"      // runner is uploading file to Vercel Blob
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
