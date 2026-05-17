# hop.agtc.app — HopClaw control plane

Web app that drives the Noraxon MR4 export workflow on a remote Windows lab kit via a Node.js runner ([asukhariev/hopclaw](https://github.com/asukhariev/hopclaw)).

## Architecture

```
[browser]  ───▶  hop.agtc.app  ───▶  Vercel Blob (sessions JSON + uploaded files)
                     ▲                       ▲
                     │                       │ runner uploads CSV
                     │ polls every 5s        │ + POSTs status events
                     │                       │
                  [runner on EC2 Windows VM with MR4 + OpenClaw]
```

Single-runner-per-lab. Polling pattern means no inbound port on the VPS.

## Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/sessions/start` | POST | UI creates a new session |
| `/api/sessions/[id]/stop` | POST | UI flags it to stop + export |
| `/api/sessions/[id]` | GET | UI polls a single session |
| `/api/sessions` | GET | UI list (last 50) |
| `/api/runner/poll` | GET | Runner asks for the next command |
| `/api/runner/event` | POST | Runner reports status/progress/file URL |
| `/api/runner/upload-url` | POST | Runner gets a signed Blob upload URL |

## Env vars

| Name | Required | What |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob token (auto-provisioned when a Blob store is added to the project) |
| `RUNNER_API_KEY` | recommended | Shared secret. Runner sends as `Authorization: Bearer <value>`. Open auth if unset (v0 only). |

## Local dev

```bash
npm install
cp .env.local.example .env.local
# Fill in BLOB_READ_WRITE_TOKEN and RUNNER_API_KEY
npm run dev
```

## Deploy

Auto-deploys to Vercel on push to `main`. Production: <https://hop.agtc.app>.
