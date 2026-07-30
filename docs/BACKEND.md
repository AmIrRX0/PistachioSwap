# Backend

`apps/api/src/app.ts` registers Fastify routes. Same-chain quote endpoints are
implemented at `apps/api/src/features/quotes/routes/quote-routes.ts`; provider
selection is in `services/quote-selector.ts`; PancakeSwap, Uniswap, and 0x
adapters are in `providers/`. Existing route URLs and JSON contracts are
unchanged. Gas Assist browser-facing routes are registered through the thin
proxy in `apps/api/src/modules/gas-assist-proxy.ts`; private eligibility,
fees, policy, order state, signing intents, submission, refunds, and admin
operations live in the sibling private service repository.

Backend source follows NodeNext rules: TypeScript source imports use `.js`
suffixes. Provider keys remain server-only.
