# Local development

The public repository expects private and infrastructure checkouts beside it:

```text
WebstormProjects/
├── PistachioSwap/
├── Gas-Assist/   # GasAssist is also detected for compatibility
└── Pchained/
```

Bootstrap missing sibling checkouts with:

```bash
pnpm local:bootstrap
```

Run the public frontend and API only:

```bash
pnpm dev
```

Run the full configured local stack:

```bash
pnpm dev --local
# equivalent
pnpm dev:local
```

Local mode starts the frontend, public API, private Gas Assist service, and every
Pchained coinstack that has a `.env` file in its coinstack directory. It runs
pending public and Gas Assist migrations before starting application processes.

Limit Pchained to selected coinstacks when debugging:

```bash
pnpm dev --local --chains=ethereum,base,bnbsmartchain
```

Useful lifecycle commands:

```bash
pnpm local:status
pnpm local:down
pnpm pchained:up --chains=all
pnpm pchained:down --chains=all
```

The generated Pchained Compose overrides bind APIs only to `127.0.0.1` on stable
ports from `3151` through `3168`. Docker volumes are preserved. The public API
receives an `UNCHAINED_HTTP_URLS_JSON` map for configured EVM coinstacks.

Required environment files are not created or copied automatically:

- `PistachioSwap/apps/api/.env`
- `Gas-Assist/.env` (or `GasAssist/.env`)
- one `.env` in each Pchained coinstack that should run

The public API and Gas Assist environment files must contain the same
`GAS_ASSIST_INTERNAL_TOKEN`, with at least 32 characters. Secret values are
validated without being printed.
