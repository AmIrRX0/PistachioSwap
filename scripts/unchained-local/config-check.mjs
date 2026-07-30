import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { unchainedHttpUrlsJson, unchainedLocalChains } from './config.mjs'
import { checkBnbConfig, upstreamCommit } from './prepare-bnb.mjs'

const expected = JSON.parse(unchainedHttpUrlsJson())
const envPath = new URL('../../apps/api/.env', import.meta.url)
let values = {}

if (existsSync(envPath)) {
  const text = readFileSync(envPath, 'utf8')
  const match = /^UNCHAINED_HTTP_URLS_JSON=(.*)$/m.exec(text)
  if (match) {
    try {
      values = JSON.parse(match[1])
    } catch {
      console.error('UNCHAINED_HTTP_URLS_JSON is present but is not valid JSON.')
      process.exit(1)
    }
  }
}

let ok = true
checkBnbConfig()
for (const chain of unchainedLocalChains) {
  if (!chain.supported) {
    console.log(`${chain.chainId} ${chain.chain} unsupported: not enabled until its upstream coinstack is configured and smoke-tested`)
    continue
  }
  const actual = values[String(chain.chainId)]
  if (actual !== expected[String(chain.chainId)]) {
    ok = false
    console.error(`${chain.chainId} ${chain.chain}: expected ${expected[String(chain.chainId)]}; found ${actual ? 'different endpoint' : 'missing'}`)
  }
}

if (ok) console.log(`Unchained local configuration matches enabled coinstack ports. upstream=${upstreamCommit}`)
else process.exit(1)
