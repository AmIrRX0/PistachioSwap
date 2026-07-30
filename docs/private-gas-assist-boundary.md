# Private Gas Assist service boundary

PistachioSwap keeps the Gas Assist user interface and public HTTP contract in this source-available repository. Gas Assist execution, MegaFuel policy handling, sponsorship accounting, settlement, refunds, abuse controls, and administrative operations run in the private `parsij/Gas-Assist` service.

The public API proxies only `/v1/gas-assist/*` and `/v1/sponsorship/*`. Private `/admin/*` routes are not exposed. The private service normally listens on `127.0.0.1:3002`, while the public API listens on `127.0.0.1:3001`.

Set the same random value of at least 32 characters as `GAS_ASSIST_INTERNAL_TOKEN` in both services. The public API sends it only through the `x-pistachio-internal-token` server-to-server header. Do not expose the private service port publicly.

## Local sibling checkout

Keep the private repository as a sibling checkout, not a submodule or vendored
folder:

```text
WebstormProjects/
  pistachioswap_lite/
  Gas-Assist/
```

The public scripts default to `../Gas-Assist`; override with
`GAS_ASSIST_LOCAL_DIR` when needed.

```bash
pnpm gas-assist:config:check
pnpm gas-assist:dev
pnpm gas-assist:smoke
```

The public API needs only proxy settings:

```dotenv
GAS_ASSIST_SERVICE_ENABLED=true
GAS_ASSIST_SERVICE_URL=http://127.0.0.1:3002
GAS_ASSIST_INTERNAL_TOKEN=<same-long-random-local-token>
GAS_ASSIST_SERVICE_TIMEOUT_MS=30000
GAS_ASSIST_SERVICE_MAX_RESPONSE_BYTES=2097152
```

The private service owns provider keys, paymaster policy IDs, database URLs,
budgets, cooldowns, settlement rules, migrations, and administrative
authentication.

## Production boundary

Production should keep the public API on `127.0.0.1:3006` and the private Gas
Assist service on `127.0.0.1:3002`. Nginx exposes only the public HTTPS site and
public API. The private service must not bind to `0.0.0.0`, `::`, or a public
VPS address.
