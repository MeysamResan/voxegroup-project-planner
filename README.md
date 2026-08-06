# Voxe Pricing Studio

Private, offline-first project pricing and delivery planning for Voxe Group.

## Privacy model

- All projects, rates, people and calculations remain in the browser on the current device.
- The app has no project database, analytics, telemetry or pricing API.
- Encrypted exports use PBKDF2-SHA256 with 250,000 iterations and AES-256-GCM.
- Plain JSON export is available only when an unencrypted editable backup is intentionally needed.
- Client view and its printout omit internal costs, wages, profit and margin.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run build
npm start
```

Open the local address shown by the server. After the first load, supported browsers can install the app and reopen its cached interface without an internet connection.

For development:

```bash
npm run dev
```

## Host it

The source is a Vinext application targeting a Cloudflare-compatible server runtime. Install dependencies, run `npm run build`, then deploy the generated `dist` artifact through the target host's normal Cloudflare Worker-compatible process.

The calculator does not require environment variables, D1, R2, authentication, a database or third-party services.

## Important backup rule

Browser data belongs to one browser profile on one device. Export an encrypted backup regularly. There is no password recovery because the password and decryption key are never stored or transmitted.
