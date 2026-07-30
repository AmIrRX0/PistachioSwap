import { normalizeAddress } from './lib/address.js'
import { CURATED_EVM_CHAIN_ID_SET } from './chains.js'

const ALLOWED_CHAINS = CURATED_EVM_CHAIN_ID_SET

function readInteger(
    name: string,
    fallback: number,
    minimum = 0,
) {
    const raw = process.env[name]?.trim()
    if (!raw) return fallback

    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < minimum) {
        throw new Error(
            `${name} must be an integer greater than or equal to ${minimum}.`,
        )
    }
    return parsed
}

export function readServerPort(value = process.env.PORT) {
    const raw = value?.trim() || '3001'
    const port = Number(raw)
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error('PORT must be an integer between 1 and 65535.')
    }
    return port
}

function readConfiguredNumber(
    name: string,
    fallback: number,
    minimum: number,
    maximum = Number.MAX_SAFE_INTEGER,
) {
    const raw = process.env[name]?.trim()
    if (!raw) return fallback

    const parsed = Number(raw)
    if (
        !Number.isFinite(parsed) ||
        parsed < minimum ||
        parsed > maximum
    ) {
        throw new Error(
            `${name} must be a number between ${minimum} and ${maximum}.`,
        )
    }

    return parsed
}

function readConfiguredInteger(
    name: string,
    fallback: number,
    minimum: number,
    maximum = Number.MAX_SAFE_INTEGER,
) {
    const value = readConfiguredNumber(name, fallback, minimum, maximum)
    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be an integer.`)
    }
    return value
}

function readAddressSet(name: string) {
    const values = new Set<string>()
    for (const raw of (process.env[name] ?? '').split(',')) {
        if (!raw.trim()) continue
        const address = normalizeAddress(raw)
        if (!address) throw new Error(`${name} contains an invalid address.`)
        values.add(address)
    }
    return values
}

function readBoolean(name: string, fallback: boolean) {
    const value = process.env[name]?.trim().toLowerCase()
    if (!value) return fallback
    if (value === 'true') return true
    if (value === 'false') return false
    throw new Error(`${name} must be either true or false.`)
}

function readUrl(
    name: string,
    fallback: string,
    allowedHosts: string[],
    allowLocalhost = false,
) {
    const raw = process.env[name]?.trim() || fallback
    const url = new URL(raw)
    const local = ['localhost', '127.0.0.1'].includes(url.hostname)

    if (
        url.username ||
        url.password ||
        (url.protocol !== 'https:' && !(allowLocalhost && local)) ||
        (!local && !allowedHosts.includes(url.hostname))
    ) {
        throw new Error(`${name} is not an allowed provider URL.`)
    }

    return url.toString().replace(/\/+$/, '')
}

function getAlchemyRpcUrl() {
    const explicit = process.env.ALCHEMY_BSC_RPC_URL?.trim()

    if (explicit) {
        return readUrl(
            'ALCHEMY_BSC_RPC_URL',
            explicit,
            ['bnb-mainnet.g.alchemy.com'],
            true,
        )
    }

    const key = process.env.ALCHEMY_API_KEY?.trim()
    const network =
        process.env.ALCHEMY_NETWORK?.trim() || 'bnb-mainnet'

    return key
        ? `https://${network}.g.alchemy.com/v2/${encodeURIComponent(key)}`
        : null
}

function readRpcUrl(name: string) {
    const raw = process.env[name]?.trim()
    if (!raw) return null

    const url = new URL(raw)
    const local = ['localhost', '127.0.0.1'].includes(url.hostname)

    if (
        url.username ||
        url.password ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    ) {
        throw new Error(`${name} must be an HTTPS RPC URL.`)
    }

    return url.toString()
}

function readOptionalHttpsUrl(name: string) {
    const raw = process.env[name]?.trim()
    if (!raw) return null
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error(`${name} must be an HTTPS URL without embedded credentials.`)
    }
    return url.toString()
}

export function getApiConfig() {
    const platformFeeBps = readInteger(
        'PLATFORM_FEE_BPS',
        0,
        0,
    )

    if (platformFeeBps > 1000) {
        throw new Error('PLATFORM_FEE_BPS cannot exceed 1000.')
    }

    const platformFeeMaxBps = readConfiguredInteger(
        'PLATFORM_FEE_MAX_BPS',
        500,
        1,
        500,
    )
    return {
        chainId: 56,
        allowedChains: ALLOWED_CHAINS,
        corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        requestTimeoutMs: readInteger(
            'PROVIDER_REQUEST_TIMEOUT_MS',
            10_000,
            1,
        ),
        alchemy: {
            rpcUrl: getAlchemyRpcUrl(),
            apiKey: process.env.ALCHEMY_API_KEY?.trim() || null,
            network:
                process.env.ALCHEMY_NETWORK?.trim() || 'bnb-mainnet',
            portfolio: {
                enabled: readBoolean('ALCHEMY_PORTFOLIO_ENABLED', false),
                cacheTtlMs: readConfiguredInteger(
                    'ALCHEMY_PORTFOLIO_CACHE_TTL_MS',
                    180_000,
                    1_000,
                    86_400_000,
                ),
                staleTtlMs: readConfiguredInteger(
                    'ALCHEMY_PORTFOLIO_STALE_TTL_MS',
                    900_000,
                    1_000,
                    86_400_000,
                ),
                timeoutMs: readConfiguredInteger(
                    'ALCHEMY_PORTFOLIO_TIMEOUT_MS',
                    12_000,
                    100,
                    60_000,
                ),
                maxPages: readConfiguredInteger(
                    'ALCHEMY_PORTFOLIO_MAX_PAGES',
                    10,
                    1,
                    100,
                ),
                maxCacheEntries: 200,
            },
            metadataTtlMs: readInteger(
                'TOKEN_METADATA_CACHE_TTL_MS',
                86_400_000,
                1,
            ),
            negativeMetadataTtlMs: 30 * 60 * 1000,
            walletTtlMs: Math.min(
                readInteger('WALLET_TOKEN_CACHE_TTL_MS', 30_000, 1),
                30_000,
            ),
            concurrency: 6,
            maxBatchSize: 50,
        },
        dexScreener: {
            baseUrl: readUrl(
                'DEXSCREENER_API_BASE_URL',
                'https://api.dexscreener.com',
                ['api.dexscreener.com'],
            ),
            chainId: 'bsc',
        },
        geckoTerminal: {
            baseUrl: readUrl(
                'GECKOTERMINAL_API_BASE_URL',
                'https://api.geckoterminal.com/api/v2',
                ['api.geckoterminal.com'],
            ),
            network:
                process.env.GECKOTERMINAL_NETWORK?.trim() || 'bsc',
            pageDelayMs: readInteger(
                'GECKOTERMINAL_PAGE_DELAY_MS',
                2_100,
                0,
            ),
            maxPages: 10,
        },
        dexPaprika: {
            enabled: readBoolean('DEXPAPRIKA_ENABLED', true),
            baseUrl: readUrl(
                'DEXPAPRIKA_BASE_URL',
                'https://api.dexpaprika.com',
                ['api.dexpaprika.com'],
            ),
            timeoutMs: readConfiguredInteger(
                'DEXPAPRIKA_TIMEOUT_MS', 10_000, 100, 60_000,
            ),
            cacheTtlMs: readConfiguredInteger(
                'DEXPAPRIKA_CACHE_TTL_MS', 1_800_000, 1,
            ),
            staleTtlMs: readConfiguredInteger(
                'DEXPAPRIKA_STALE_TTL_MS', 86_400_000, 1,
            ),
            perChainLimit: readConfiguredInteger(
                'DEXPAPRIKA_PER_CHAIN_LIMIT', 100, 1, 100,
            ),
            minimumLiquidityUsd: readConfiguredNumber(
                'DEXPAPRIKA_MIN_LIQUIDITY_USD', 100_000, 0,
            ),
            minimumTransactions24h: readConfiguredInteger(
                'DEXPAPRIKA_MIN_TXNS_24H', 50, 0,
            ),
            refreshConcurrency: readConfiguredInteger(
                'DEXPAPRIKA_REFRESH_CONCURRENCY', 2, 1, 3,
            ),
        },
        coinGecko: {
            apiKey:
                process.env.COINGECKO_DEMO_API_KEY?.trim() || null,
            baseUrl: readUrl(
                'COINGECKO_API_BASE_URL',
                'https://api.coingecko.com/api/v3',
                ['api.coingecko.com'],
                true,
            ),
            network:
                process.env.COINGECKO_NETWORK_56?.trim() || 'bsc',
            searchTtlMs: 5 * 60 * 1000,
            tokenTtlMs: 24 * 60 * 60 * 1000,
            negativeTokenTtlMs: 15 * 60 * 1000,
        },
        moralis: {
            enabled: readBoolean('MORALIS_ENABLED', true),
            baseUrl: readUrl(
                'MORALIS_API_BASE_URL',
                'https://deep-index.moralis.io/api/v2.2',
                ['deep-index.moralis.io'],
            ),
            apiKey: process.env.MORALIS_API_KEY?.trim() || null,
            cacheTtlMs: readConfiguredInteger(
                'MORALIS_WALLET_CACHE_TTL_MS',
                300_000,
                1,
            ),
            requestTimeoutMs: readConfiguredInteger(
                'MORALIS_REQUEST_TIMEOUT_MS',
                10_000,
                100,
                60_000,
            ),
        },
        honeypot: {
            enabled: readBoolean('HONEYPOT_ENABLED', true),
            baseUrl: readUrl(
                'HONEYPOT_API_BASE_URL',
                'https://api.honeypot.is',
                ['api.honeypot.is'],
            ),
            apiKey: process.env.HONEYPOT_API_KEY?.trim() || null,
        },
        goPlus: {
            enabled: readBoolean('GOPLUS_ENABLED', false),
            baseUrl: readUrl(
                'GOPLUS_API_BASE_URL',
                'https://api.gopluslabs.io/api/v1',
                ['api.gopluslabs.io'],
            ),
            accessToken: process.env.GOPLUS_ACCESS_TOKEN?.trim() || null,
            batchSize: readConfiguredInteger(
                'GOPLUS_BATCH_SIZE',
                20,
                1,
                20,
            ),
        },
        tokenSecurity: {
            cacheTtlMs: readConfiguredInteger(
                'TOKEN_SECURITY_CACHE_TTL_MS',
                43_200_000,
                1,
            ),
            blockedCacheTtlMs: readConfiguredInteger(
                'TOKEN_SECURITY_BLOCKED_CACHE_TTL_MS',
                86_400_000,
                1,
            ),
            unknownCacheTtlMs: readConfiguredInteger(
                'TOKEN_SECURITY_UNKNOWN_CACHE_TTL_MS',
                3_600_000,
                1,
            ),
            errorCacheTtlMs: readConfiguredInteger(
                'TOKEN_SECURITY_ERROR_CACHE_TTL_MS',
                300_000,
                1,
            ),
            concurrency: readConfiguredInteger(
                'TOKEN_SECURITY_CONCURRENCY',
                4,
                1,
                20,
            ),
            requestTimeoutMs: readConfiguredInteger(
                'TOKEN_SECURITY_REQUEST_TIMEOUT_MS',
                10_000,
                100,
                60_000,
            ),
        },
        market: {
            catalogTtlMs: readConfiguredInteger(
                'ESTABLISHED_TOKEN_CACHE_TTL_MS',
                1_800_000,
                1,
            ),
            partialRetryMs: readConfiguredInteger(
                'ESTABLISHED_TOKEN_PARTIAL_RETRY_MS',
                300_000,
                1,
            ),
            refreshConcurrency: readConfiguredInteger(
                'ESTABLISHED_TOKEN_REFRESH_CONCURRENCY',
                2,
                1,
                3,
            ),
            routeRateLimitPerMinute: readConfiguredInteger(
                'MARKET_TOKEN_ROUTE_RATE_LIMIT_PER_MINUTE',
                240,
                30,
                2_000,
            ),
            staleTtlMs: readConfiguredInteger(
                'ESTABLISHED_TOKEN_STALE_TTL_MS',
                86_400_000,
                1,
            ),
            searchTtlMs: readInteger(
                'MARKET_TOKEN_SEARCH_CACHE_TTL_MS',
                300_000,
                1,
            ),
            minimumLiquidityUsd: readConfiguredNumber(
                'ESTABLISHED_TOKEN_MIN_LIQUIDITY_USD',
                100_000,
                0,
            ),
            minimumLargestPoolLiquidityUsd: readConfiguredNumber(
                'ESTABLISHED_TOKEN_MIN_LARGEST_POOL_LIQUIDITY_USD',
                50_000,
                0,
            ),
            minimumVolume24hUsd: readConfiguredNumber(
                'ESTABLISHED_TOKEN_MIN_VOLUME_24H_USD',
                10_000,
                0,
            ),
            minimumPoolAgeDays: readConfiguredNumber(
                'ESTABLISHED_TOKEN_MIN_POOL_AGE_DAYS',
                365,
                0,
            ),
            minimumTransactions24h: readConfiguredInteger(
                'ESTABLISHED_TOKEN_MIN_TXNS_24H',
                100,
                0,
            ),
            minimumUniqueTraders24h: readConfiguredInteger(
                'ESTABLISHED_TOKEN_MIN_UNIQUE_TRADERS_24H',
                25,
                0,
            ),
            minimumPairCount: readConfiguredInteger(
                'ESTABLISHED_TOKEN_MIN_PAIR_COUNT',
                1,
                1,
            ),
            defaultLimit: readConfiguredInteger(
                'ESTABLISHED_TOKEN_LIMIT',
                1_000,
                1,
                1_000,
            ),
            candidateLimit: readConfiguredInteger(
                'ESTABLISHED_CANDIDATE_LIMIT',
                250,
                1,
                1_000,
            ),
            searchLimit: Math.min(
                readInteger('MARKET_TOKEN_SEARCH_LIMIT', 20, 1),
                20,
            ),
            maximumQueryLength: 80,
            wrappedNativeAddress: normalizeAddress(
                process.env.PANCAKESWAP_WRAPPED_NATIVE_ADDRESS_56,
            ) ?? '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            chainLogoUri: '/icons/bnb.svg',
            blocklist: readAddressSet('ESTABLISHED_TOKEN_BLOCKLIST'),
            snapshotEnabled: readBoolean(
                'ESTABLISHED_TOKEN_SNAPSHOT_ENABLED',
                true,
            ),
        },
        walletTokens: {
            allowlist: readAddressSet('WALLET_TOKEN_ALLOWLIST_56'),
            blocklist: readAddressSet('WALLET_TOKEN_BLOCKLIST_56'),
            meaningfulLiquidityUsd: readConfiguredNumber(
                'WALLET_TOKEN_MEANINGFUL_LIQUIDITY_USD',
                10_000,
                0,
            ),
            strongLiquidityUsd: readConfiguredNumber(
                'WALLET_TOKEN_STRONG_LIQUIDITY_USD',
                50_000,
                0,
            ),
        },
        quotes: {
            mode:
                process.env.QUOTE_PROVIDER_MODE?.trim().toLowerCase() ||
                'best',
            providers: (
                process.env.QUOTE_PROVIDERS ||
                'uniswap,0x,pancakeswap'
            )
                .split(',')
                .map((value) => value.trim().toLowerCase()),
            timeoutMs: readInteger('QUOTE_TIMEOUT_MS', 10_000, 1),
            uniswap: {
                enabled: readBoolean('UNISWAP_ENABLED', true),
                apiKey: process.env.UNISWAP_API_KEY?.trim() || null,
                baseUrl: readUrl(
                    'UNISWAP_API_BASE_URL',
                    'https://trade-api.gateway.uniswap.org/v1',
                    ['trade-api.gateway.uniswap.org'],
                ),
            },
            zeroX: {
                enabled: readBoolean('ZEROX_ENABLED', true),
                apiKey: process.env.ZEROX_API_KEY?.trim() || null,
                baseUrl: readUrl(
                    'ZEROX_API_BASE_URL',
                    'https://api.0x.org',
                    ['api.0x.org'],
                ),
            },
            pancakeSwap: {
                enabled: readBoolean('PANCAKESWAP_ENABLED', true),
                routerAddress: normalizeAddress(
                    process.env.PANCAKESWAP_ROUTER_ADDRESS_56,
                ),
                permit2Address: normalizeAddress(
                    process.env.PANCAKESWAP_PERMIT2_ADDRESS_56 ??
                    '0x000000000022d473030f116ddee9f6b43ac78ba3',
                ),
                quoterAddress: normalizeAddress(
                    process.env.PANCAKESWAP_QUOTER_ADDRESS_56,
                ),
                wrappedNativeAddress: normalizeAddress(
                    process.env.PANCAKESWAP_WRAPPED_NATIVE_ADDRESS_56,
                ),
                rpcUrl: readRpcUrl('BSC_RPC_URL') || getAlchemyRpcUrl(),
                feeExecutorAddress: normalizeAddress(
                    process.env.FEE_EXECUTOR_ADDRESS_56,
                ),
            },
        },
        crossChain: {
            capabilityTtlMs: readConfiguredInteger(
                'CROSS_CHAIN_CAPABILITY_TTL_MS',
                30 * 60 * 1000,
                1_000,
            ),
            negativeCapabilityTtlMs: readConfiguredInteger(
                'CROSS_CHAIN_NEGATIVE_CAPABILITY_TTL_MS',
                60_000,
                1_000,
            ),
            quoteTimeoutMs: readConfiguredInteger(
                'CROSS_CHAIN_QUOTE_TIMEOUT_MS',
                12_000,
                1_000,
                60_000,
            ),
            zeroX: {
                enabled: readBoolean('ZEROX_CROSS_CHAIN_ENABLED', false),
                apiKey: process.env.ZEROX_API_KEY?.trim() || null,
                baseUrl: readUrl(
                    'ZEROX_CROSS_CHAIN_API_BASE_URL',
                    'https://api.0x.org',
                    ['api.0x.org'],
                ),
            },
            across: {
                enabled: readBoolean('ACROSS_ENABLED', true),
                baseUrl: readUrl(
                    'ACROSS_API_BASE_URL',
                    'https://app.across.to/api',
                    ['app.across.to'],
                ),
                apiKey: process.env.ACROSS_API_KEY?.trim() || null,
                integratorId:
                    process.env.ACROSS_INTEGRATOR_ID?.trim() || null,
            },
            debridge: {
                enabled: readBoolean('DEBRIDGE_ENABLED', true),
                baseUrl: readUrl(
                    'DEBRIDGE_API_BASE_URL',
                    'https://dln.debridge.finance',
                    ['dln.debridge.finance'],
                ),
                accessToken:
                    process.env.DEBRIDGE_ACCESS_TOKEN?.trim() || null,
                referralCode:
                    process.env.DEBRIDGE_REFERRAL_CODE?.trim() || null,
            },
            relay: {
                enabled: readBoolean('RELAY_ENABLED', true),
                baseUrl: readUrl(
                    'RELAY_API_BASE_URL',
                    'https://api.relay.link',
                    ['api.relay.link'],
                ),
                apiKey: process.env.RELAY_API_KEY?.trim() || null,
            },
            chainflip: {
                enabled: readBoolean('CHAINFLIP_ENABLED', false),
                network:
                    process.env.CHAINFLIP_NETWORK?.trim().toLowerCase() ||
                    'mainnet',
                brokerApiUrl: readOptionalHttpsUrl(
                    'CHAINFLIP_BROKER_API_URL',
                ),
                brokerCommissionBps: readConfiguredInteger(
                    'CHAINFLIP_BROKER_COMMISSION_BPS',
                    0,
                    0,
                    1_000,
                ),
            },
        },
        fees: {
            treasuryAddress: normalizeAddress(
                process.env.TREASURY_ADDRESS,
            ),
            platformFeeBps,
            platformFeeMaxBps,
            collectionMode:
                process.env.FEE_COLLECTION_MODE?.trim() ||
                'provider-affiliate',
            tokenMode:
                process.env.FEE_TOKEN_MODE?.trim() || 'buyToken',
        },
    }
}

export type ApiConfig = ReturnType<typeof getApiConfig>

export function getWalletTokenAddressPolicy(chainId: number) {
    if (!ALLOWED_CHAINS.has(chainId)) {
        throw new Error('Wallet-token policy chain is not enabled.')
    }
    return {
        allowlist: readAddressSet(
            `WALLET_TOKEN_ALLOWLIST_${chainId}`,
        ),
        blocklist: readAddressSet(
            `WALLET_TOKEN_BLOCKLIST_${chainId}`,
        ),
    }
}

export function validateStartupConfig(config = getApiConfig()) {
    const validQuoteModes = new Set([
        'best',
        'uniswap',
        '0x',
        'pancakeswap',
    ])
    const validFeeModes = new Set([
        'none',
        'provider-affiliate',
        'executor-contract',
    ])
    if (
        config.alchemy.portfolio.enabled &&
        !config.alchemy.apiKey
    ) {
        throw new Error(
            'ALCHEMY_API_KEY is required when ALCHEMY_PORTFOLIO_ENABLED=true.',
        )
    }

    if (!validQuoteModes.has(config.quotes.mode)) {
        throw new Error('QUOTE_PROVIDER_MODE is invalid.')
    }

    if (!validFeeModes.has(config.fees.collectionMode)) {
        throw new Error('FEE_COLLECTION_MODE is invalid.')
    }

    if (config.fees.tokenMode !== 'buyToken') {
        throw new Error('Only FEE_TOKEN_MODE=buyToken is supported.')
    }

    if (
        config.fees.platformFeeBps > 0 &&
        !config.fees.treasuryAddress
    ) {
        throw new Error(
            'A nonzero platform fee requires TREASURY_ADDRESS.',
        )
    }

    if (
        config.fees.platformFeeBps > 0 &&
        config.fees.collectionMode === 'executor-contract' &&
        !config.quotes.pancakeSwap.feeExecutorAddress
    ) {
        throw new Error(
            'executor-contract fee mode requires FEE_EXECUTOR_ADDRESS_56.',
        )
    }

    if (
        config.fees.platformFeeBps > 0 &&
        config.fees.collectionMode === 'none'
    ) {
        throw new Error(
            'A nonzero platform fee requires a collection mode.',
        )
    }

    if (
        config.fees.platformFeeBps > 0 &&
        config.fees.collectionMode === 'provider-affiliate' &&
        !(
            (config.quotes.zeroX.enabled && config.quotes.zeroX.apiKey) ||
            (config.quotes.uniswap.enabled && config.quotes.uniswap.apiKey)
        )
    ) {
        throw new Error(
            'provider-affiliate fee mode requires an enabled provider with documented affiliate-fee support.',
        )
    }

    if (
        config.crossChain.across.integratorId &&
        !/^0x[0-9a-fA-F]{4}$/.test(config.crossChain.across.integratorId)
    ) {
        throw new Error('ACROSS_INTEGRATOR_ID must be a 2-byte hex value.')
    }
    if (
        config.crossChain.chainflip.enabled &&
        config.crossChain.chainflip.network !== 'mainnet'
    ) {
        throw new Error('Enabled Chainflip must use mainnet.')
    }

    return config
}
