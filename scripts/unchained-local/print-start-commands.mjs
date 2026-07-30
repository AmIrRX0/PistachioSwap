import { unchainedHttpUrlsJson, unchainedLocalChains } from './config.mjs'
import { upstreamCommit, upstreamRepo } from './prepare-bnb.mjs'

console.log('UNCHAINED_ENABLED=true')
console.log('UNCHAINED_REQUEST_TIMEOUT_MS=8000')
console.log(`UNCHAINED_HTTP_URLS_JSON=${unchainedHttpUrlsJson()}`)
console.log('')
console.log(`# Pinned Pchained source: ${upstreamRepo} ${upstreamCommit}`)
console.log('pnpm unchained:bnb:config:check')
console.log('pnpm unchained:bnb:up')
console.log('pnpm unchained:bnb:smoke')
console.log('')
for (const chain of unchainedLocalChains) {
  if (!chain.supported) {
    console.log(`# ${chain.chain} (${chain.chainId}) is unsupported locally until configured and smoke-tested.`)
    continue
  }
  console.log(`# ${chain.chain} (${chain.chainId})`)
  console.log(`# expose API to PistachioSwap at http://127.0.0.1:${chain.port}`)
  console.log('')
}
