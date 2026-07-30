import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    NATIVE_TOKEN_ADDRESS,
    normalizeAddress,
} from '../lib/address.js'
import {
    ACTIVE_TOKEN_DISCOVERY_CHAINS,
    getTokenDiscoveryChain,
} from './registry.js'

export const FALLBACK_TOKEN_MAX_ADDRESSES_PER_CHAIN = 100

export const FALLBACK_TOKEN_ADDRESS_DIRECTORY = fileURLToPath(
    new URL('../../data/fallback-token-addresses', import.meta.url),
)

export type ParsedFallbackTokenAddresses = {
    chainId: number
    addresses: string[]
    errors: string[]
}

export type FallbackTokenSearchEntry = {
    chainId: number
    address: string
    symbol: string
    name: string
}

const searchIndexPromises = new Map<string, Promise<FallbackTokenSearchEntry[]>>()

export function parseFallbackTokenAddressText({
    chainId,
    text,
}: {
    chainId: number
    text: string
}): ParsedFallbackTokenAddresses {
    const chain = getTokenDiscoveryChain(chainId)
    const errors: string[] = []
    const addresses: string[] = []
    const seen = new Set<string>()

    if (!chain?.active) {
        errors.push(`Unsupported fallback token chain file: ${chainId}`)
    }

    text.split(/\r?\n/).forEach((rawLine, index) => {
        const lineNumber = index + 1
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) return

        const address = normalizeAddress(line)
        if (!address) {
            errors.push(`${chainId}:${lineNumber} invalid address: ${line}`)
            return
        }
        if (address === NATIVE_TOKEN_ADDRESS) {
            errors.push(`${chainId}:${lineNumber} native zero address is not allowed`)
            return
        }
        if (seen.has(address)) {
            errors.push(`${chainId}:${lineNumber} duplicate address: ${address}`)
            return
        }
        seen.add(address)
        addresses.push(address)
    })

    if (addresses.length > FALLBACK_TOKEN_MAX_ADDRESSES_PER_CHAIN) {
        errors.push(
            `${chainId} has ${addresses.length} fallback addresses; maximum is ` +
                `${FALLBACK_TOKEN_MAX_ADDRESSES_PER_CHAIN}`,
        )
    }

    return { chainId, addresses, errors }
}

/**
 * Parses the human-readable `# SYMBOL | Name | source` line immediately above
 * each address. These records are discovery hints only, never trust or pricing
 * assertions, and are used to avoid missing a chain during an all-chain search.
 */
export function parseFallbackTokenSearchEntries({
    chainId,
    text,
}: {
    chainId: number
    text: string
}): FallbackTokenSearchEntry[] {
    if (!getTokenDiscoveryChain(chainId)?.active) return []
    const entries: FallbackTokenSearchEntry[] = []
    let pending: { symbol: string; name: string } | null = null

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim()
        const metadata = /^#\s*([^|#]+?)\s*\|\s*([^|#]+?)\s*\|/u.exec(line)
        if (metadata) {
            pending = {
                symbol: metadata[1].trim(),
                name: metadata[2].trim(),
            }
            continue
        }
        if (!line || line.startsWith('#')) continue
        const address = normalizeAddress(line)
        if (address && pending) {
            entries.push({ chainId, address, ...pending })
        }
        pending = null
    }

    return entries
}

export async function readFallbackTokenAddressFile({
    chainId,
    directory = FALLBACK_TOKEN_ADDRESS_DIRECTORY,
}: {
    chainId: number
    directory?: string
}) {
    const text = await readFile(join(directory, `${chainId}.txt`), 'utf8')
    return parseFallbackTokenAddressText({ chainId, text })
}

async function loadFallbackTokenSearchIndex(
    directory = FALLBACK_TOKEN_ADDRESS_DIRECTORY,
) {
    let pending = searchIndexPromises.get(directory)
    if (!pending) {
        pending = Promise.all(ACTIVE_TOKEN_DISCOVERY_CHAINS.map(async (chain) => {
            try {
                const text = await readFile(join(directory, `${chain.chainId}.txt`), 'utf8')
                return parseFallbackTokenSearchEntries({
                    chainId: chain.chainId,
                    text,
                })
            } catch {
                return []
            }
        })).then((groups) => groups.flat())
        searchIndexPromises.set(directory, pending)
    }
    return pending
}

export async function searchFallbackTokenAddressDirectory(
    query: string,
    directory = FALLBACK_TOKEN_ADDRESS_DIRECTORY,
) {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    const index = await loadFallbackTokenSearchIndex(directory)
    return index.filter((entry) =>
        entry.address === normalized ||
        entry.symbol.toLowerCase().includes(normalized) ||
        entry.name.toLowerCase().includes(normalized))
}

export async function readFallbackTokenAddressDirectory(
    directory = FALLBACK_TOKEN_ADDRESS_DIRECTORY,
) {
    const activeChainIds = new Set(
        ACTIVE_TOKEN_DISCOVERY_CHAINS.map((chain) => chain.chainId),
    )
    const files = await readdir(directory)
    const errors: string[] = []
    const parsed = new Map<number, ParsedFallbackTokenAddresses>()

    for (const file of files) {
        if (!file.endsWith('.txt')) continue
        const idText = basename(file, '.txt')
        if (!/^[1-9]\d*$/.test(idText)) {
            errors.push(`Unsupported fallback token address file name: ${file}`)
            continue
        }
        const chainId = Number(idText)
        if (!activeChainIds.has(chainId)) {
            errors.push(`Unsupported fallback token chain file: ${file}`)
            continue
        }
    }

    for (const chain of ACTIVE_TOKEN_DISCOVERY_CHAINS) {
        try {
            const result = await readFallbackTokenAddressFile({
                chainId: chain.chainId,
                directory,
            })
            parsed.set(chain.chainId, result)
            errors.push(...result.errors)
        } catch {
            errors.push(`Missing fallback token address file: ${chain.chainId}.txt`)
            parsed.set(chain.chainId, {
                chainId: chain.chainId,
                addresses: [],
                errors: [`Missing fallback token address file: ${chain.chainId}.txt`],
            })
        }
    }

    const duplicateIdentities = new Set<string>()
    for (const result of parsed.values()) {
        for (const address of result.addresses) {
            const identity = `${result.chainId}:${address}`
            if (duplicateIdentities.has(identity)) {
                errors.push(`Duplicate fallback token identity: ${identity}`)
            }
            duplicateIdentities.add(identity)
        }
    }

    return { parsed, errors }
}
