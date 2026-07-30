import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const upstreamRepo = 'https://github.com/parsij/Pchained.git'
export const upstreamCommit = '0d9cf6682b329b2b14a8959400a25720a77247e0'
export const smokeWallet = '0x2941909551C7ceFd9EbEB1C5200D8B614CF887Ca'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const upstreamDir = resolve(root, '.unchained/Pchained')
const generatedEnvPath = resolve(root, '.unchained/bnbsmartchain.env')
const apiEnvPath = resolve(root, 'apps/api/.env')

export function readDotEnv(path) {
  const values = {}
  if (!existsSync(path)) return values
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return values
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.stdio ?? 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
  return result
}

export function ensureUpstream() {
  mkdirSync(resolve(root, '.unchained'), { recursive: true })
  if (!existsSync(resolve(upstreamDir, '.git'))) {
    run('git', [
      'clone',
      '--no-tags',
      '--single-branch',
      '--branch',
      'main',
      upstreamRepo,
      upstreamDir,
    ])
  }
  run('git', ['-C', upstreamDir, 'fetch', '--depth', '1', 'origin', upstreamCommit])
  run('git', ['-C', upstreamDir, 'checkout', '--detach', upstreamCommit])
}

function splitRpcUrl(fullUrl) {
  try {
    const url = new URL(fullUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 0) return null
    const key = parts.at(-1)
    url.pathname = `/${parts.slice(0, -1).join('/')}`
    return {
      base: url.toString().replace(/\/+$/, ''),
      key,
    }
  } catch {
    return null
  }
}

export function bnbConfig() {
  const env = readDotEnv(apiEnvPath)
  const rpcFromBsc = splitRpcUrl(env.BSC_RPC_URL ?? '')
  const values = {
    INDEXER_URL: env.UNCHAINED_BNB_INDEXER_URL || 'https://deep-index.moralis.io/api/v2.2',
    INDEXER_WS_URL: env.UNCHAINED_BNB_INDEXER_WS_URL || '',
    INDEXER_API_KEY: env.UNCHAINED_BNB_INDEXER_API_KEY || env.MORALIS_API_KEY || '',
    RPC_URL: env.UNCHAINED_BNB_RPC_URL || rpcFromBsc?.base || '',
    RPC_API_KEY: env.UNCHAINED_BNB_RPC_API_KEY || rpcFromBsc?.key || '',
    WEBHOOK_URL: env.UNCHAINED_BNB_WEBHOOK_URL || '',
    LOG_LEVEL: env.UNCHAINED_LOG_LEVEL || 'info',
    NETWORK: 'mainnet',
    ENVIRONMENT: 'local',
  }
  return values
}

export function checkBnbConfig({ writeEnv = false } = {}) {
  const values = bnbConfig()
  const missing = []
  for (const name of ['INDEXER_URL', 'INDEXER_API_KEY', 'RPC_URL', 'RPC_API_KEY', 'WEBHOOK_URL']) {
    if (!values[name]) missing.push(name)
  }
  if (missing.length > 0) {
    console.error(`Missing BNB Pchained configuration: ${missing.join(', ')}`)
    process.exit(1)
  }
  if (writeEnv) {
    mkdirSync(dirname(generatedEnvPath), { recursive: true })
    writeFileSync(
      generatedEnvPath,
      Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
      { mode: 0o600 },
    )
  }
  return values
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkBnbConfig({ writeEnv: true })
  ensureUpstream()
  console.log(`Prepared Pchained ${upstreamCommit} for BNB Smart Chain.`)
}
