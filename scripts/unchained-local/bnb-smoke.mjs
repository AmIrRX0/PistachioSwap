import { smokeWallet } from './prepare-bnb.mjs'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? value.toLowerCase()
    : null
}

function validAccount(value) {
  const account = isRecord(value.account) ? value.account : value
  if (!isRecord(account)) return { ok: false, field: 'account' }
  if (!/^\d+$/.test(String(account.balance ?? ''))) return { ok: false, field: 'balance' }
  if (normalizeAddress(account.pubkey) !== normalizeAddress(smokeWallet)) return { ok: false, field: 'pubkey' }
  if (!Array.isArray(account.tokens)) return { ok: false, field: 'tokens' }
  let erc20Positive = 0
  for (const token of account.tokens) {
    if (!isRecord(token)) return { ok: false, field: 'tokens[]' }
    if (!normalizeAddress(token.contract)) return { ok: false, field: 'tokens[].contract' }
    if (!/^\d+$/.test(String(token.balance ?? ''))) return { ok: false, field: 'tokens[].balance' }
    if (!Number.isInteger(Number(token.decimals))) return { ok: false, field: 'tokens[].decimals' }
    if (BigInt(token.balance) > 0n) erc20Positive += 1
  }
  return {
    ok: true,
    nativePositive: BigInt(account.balance) > 0n ? 1 : 0,
    erc20Positive,
    erc20Total: account.tokens.length,
  }
}

let response
try {
  response = await fetch(`http://127.0.0.1:3156/api/v1/account/${smokeWallet}`, {
    signal: AbortSignal.timeout(10_000),
  })
} catch (error) {
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object'
    ? error.cause
    : null
  const code = cause && 'code' in cause ? cause.code : null
  console.error(`BNB account smoke failed: ${code === 'ECONNREFUSED' ? 'connection-refused' : 'request-failed'}`)
  process.exit(1)
}
if (!response.ok) {
  console.error(`BNB account smoke failed: HTTP ${response.status}`)
  process.exit(1)
}
const payload = await response.json()
const result = validAccount(payload)
if (!result.ok) {
  console.error(`BNB account smoke failed schema field: ${result.field}`)
  process.exit(1)
}
console.log(`BNB account smoke passed: HTTP 200, nativePositive=${result.nativePositive}, erc20Positive=${result.erc20Positive}, erc20Total=${result.erc20Total}, addressMatched=true`)
