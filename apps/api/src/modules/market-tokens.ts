import {
    usesShapeShiftDexScreenerPricing,
} from '../providers/wallet-price-request-scope.js'
import {
    marketCatalogService as baseMarketCatalogService,
} from './market-tokens-base.js'

export * from './market-tokens-base.js'

function emptyWalletCatalogResult() {
    const generatedAt = Date.now()
    return {
        catalog: {
            generatedAt,
            expiresAt: generatedAt + 60_000,
            staleUntil: generatedAt + 60_000,
            partial: false,
            catalogUnavailable: false,
            tokens: [],
            commonTokens: [],
            stats: {
                candidatesInspected: 0,
                recognizedCandidates: 0,
                establishedTokens: 0,
                pagesCompleted: 0,
                providerPartial: false,
                providerFailures: {
                    dexPaprika: false,
                    geckoTerminalPagination: false,
                    coinGeckoFailedBatches: 0,
                    dexScreenerFailedBatches: 0,
                },
                exclusionReasons: {},
            },
            providerMetadata: {
                availableProviders: [],
                unavailableProviders: [],
            },
            persistence: {
                source: 'curated',
                lastAttemptedAt: null,
                lastSuccessAt: null,
                nextRefreshAt: null,
                contentHash: null,
            },
        },
        stale: false,
        hardStale: false,
    } as Awaited<ReturnType<typeof baseMarketCatalogService.getCatalog>>
}

export const marketCatalogService: typeof baseMarketCatalogService = new Proxy(
    baseMarketCatalogService,
    {
        get(target, property, receiver) {
            if (property === 'getCatalog') {
                return (...args: Parameters<typeof target.getCatalog>) => {
                    if (usesShapeShiftDexScreenerPricing()) {
                        return Promise.resolve(emptyWalletCatalogResult())
                    }
                    return target.getCatalog(...args)
                }
            }
            const value = Reflect.get(target, property, receiver)
            return typeof value === 'function' ? value.bind(target) : value
        },
    },
)
