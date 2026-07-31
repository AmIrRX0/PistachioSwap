import { existsSync } from 'node:fs'
import path from 'node:path'

export const PCHAINED_CHAINS = Object.freeze([
    { name: 'ethereum', runtime: 'node', port: 3151, chainId: 1 },
    { name: 'base', runtime: 'node', port: 3152, chainId: 8453 },
    { name: 'arbitrum', runtime: 'node', port: 3153, chainId: 42161 },
    { name: 'optimism', runtime: 'node', port: 3154, chainId: 10 },
    { name: 'polygon', runtime: 'node', port: 3155, chainId: 137 },
    { name: 'bnbsmartchain', runtime: 'node', port: 3156, chainId: 56 },
    { name: 'avalanche', runtime: 'node', port: 3157, chainId: 43114 },
    { name: 'gnosis', runtime: 'node', port: 3158, chainId: 100 },
    { name: 'solana', runtime: 'node', port: 3159 },
    { name: 'bitcoin', runtime: 'node', port: 3160 },
    { name: 'bitcoincash', runtime: 'node', port: 3161 },
    { name: 'dogecoin', runtime: 'node', port: 3162 },
    { name: 'litecoin', runtime: 'node', port: 3163 },
    { name: 'zcash', runtime: 'node', port: 3164 },
    { name: 'cosmos', runtime: 'go', port: 3165 },
    { name: 'thorchain', runtime: 'go', port: 3166 },
    { name: 'thorchain-v1', runtime: 'go', port: 3167 },
    { name: 'mayachain', runtime: 'go', port: 3168 },
])

const aliases = new Map([
    ['eth', 'ethereum'],
    ['arb', 'arbitrum'],
    ['op', 'optimism'],
    ['matic', 'polygon'],
    ['bnb', 'bnbsmartchain'],
    ['bsc', 'bnbsmartchain'],
    ['avax', 'avalanche'],
    ['bch', 'bitcoincash'],
    ['doge', 'dogecoin'],
    ['ltc', 'litecoin'],
])

export function chainPaths(pchainedDir, chain) {
    const baseDir = path.join(pchainedDir, chain.runtime, 'coinstacks', chain.name)
    return {
        baseDir,
        composePath: path.join(baseDir, 'docker-compose.yml'),
        envPath: path.join(baseDir, '.env'),
        sampleEnvPath: path.join(baseDir, 'sample.env'),
        networkName: chain.runtime === 'node' ? `${chain.name}_default` : chain.name,
        projectName: `pistachio-pchained-${chain.name.replace(/[^a-z0-9]+/g, '-')}`,
    }
}

export function normalizeChainName(value) {
    const normalized = String(value ?? '').trim().toLowerCase()
    return aliases.get(normalized) ?? normalized
}

export function parseChainSelection(argv = process.argv.slice(2), env = process.env) {
    const option = argv.find((arg) => arg.startsWith('--chains='))
    const raw = option?.slice('--chains='.length) || env.PCHAINED_LOCAL_CHAINS || 'all'
    const requested = raw
        .split(',')
        .map(normalizeChainName)
        .filter(Boolean)

    if (requested.length === 0 || requested.includes('all')) return 'all'
    return [...new Set(requested)]
}

export function selectPchainedChains({ pchainedDir, selection = 'all', requireConfigured = true }) {
    const available = []
    const unavailable = []

    for (const chain of PCHAINED_CHAINS) {
        const paths = chainPaths(pchainedDir, chain)
        const sourcePresent = existsSync(paths.composePath)
        const configured = existsSync(paths.envPath)
        if (sourcePresent && (!requireConfigured || configured)) {
            available.push({ ...chain, ...paths, configured })
        } else {
            unavailable.push({ ...chain, ...paths, sourcePresent, configured })
        }
    }

    if (selection === 'all') return { selected: available, unavailable }

    const byName = new Map([...available, ...unavailable].map((chain) => [chain.name, chain]))
    const selected = selection.map((name) => {
        const chain = byName.get(name)
        if (!chain) throw new Error(`Unknown Pchained chain: ${name}`)
        if (!chain.sourcePresent) throw new Error(`Pchained source is missing for ${name}: ${chain.composePath}`)
        if (requireConfigured && !chain.configured) {
            throw new Error(`Pchained ${name} is not configured. Create ${chain.envPath}`)
        }
        return chain
    })

    return { selected, unavailable }
}

export function evmEndpointMap(chains) {
    return Object.fromEntries(
        chains
            .filter((chain) => Number.isInteger(chain.chainId))
            .map((chain) => [String(chain.chainId), `http://127.0.0.1:${chain.port}`]),
    )
}
