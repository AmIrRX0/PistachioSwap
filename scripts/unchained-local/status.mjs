import net from 'node:net'
import { unchainedLocalChains } from './config.mjs'
import { smokeWallet } from './prepare-bnb.mjs'

function listening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.setTimeout(750)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

async function checkAccount(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/account/${smokeWallet}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return `unhealthy http-${response.status}`
    const payload = await response.json()
    const account = payload && typeof payload === 'object' && payload.account
      ? payload.account
      : payload
    const pubkey = typeof account?.pubkey === 'string' ? account.pubkey.toLowerCase() : ''
    const ok = /^\d+$/.test(String(account?.balance ?? '')) &&
      Array.isArray(account?.tokens) &&
      pubkey === smokeWallet.toLowerCase()
    return ok ? 'healthy' : 'unhealthy schema-mismatch'
  } catch (error) {
    if (error instanceof SyntaxError) return 'unhealthy invalid-json'
    return 'unhealthy timeout-or-request-failed'
  }
}

for (const chain of unchainedLocalChains) {
  if (!chain.supported) {
    console.log(`${chain.chainId} ${chain.chain} unsupported`)
    continue
  }
  const isListening = await listening(chain.port)
  if (!isListening) {
    console.log(`${chain.chainId} ${chain.chain} not-running`)
    continue
  }
  console.log(`${chain.chainId} ${chain.chain} ${await checkAccount(chain.port)}`)
}
