import type { WalletToken } from '../alchemy/wallet-tokens.js'
import {
    createDexScreenerWalletPriceCache as createBaseWalletPriceCache,
} from './wallet-price-cache-base.js'

export * from './wallet-price-cache-base.js'

const SHAPESHIFT_REASON = 'shapeshift-asset-catalog'
const UNLISTED_REASON = 'not-in-shapeshift-asset-catalog'

type WalletPriceCache = ReturnType<typeof createBaseWalletPriceCache>

function addReason(values: string[] | undefined, reason: string) {
    return [...new Set([...(values ?? []), reason])]
}

function isShapeShiftListed(token: WalletToken) {
    return [
        token.classificationReasons,
        token.recognitionReasons,
        token.verificationReasons,
        token.securityReasons,
        token.visibilityReasons,
    ].some((values) => Array.isArray(values) && values.includes(SHAPESHIFT_REASON))
}

function enforceShapeShiftPolicy(token: WalletToken): WalletToken {
    if (isShapeShiftListed(token)) return token
    const blocked = token.classificationTier === 'blocked' ||
        token.securityStatus === 'blocked'
    return {
        ...token,
        priceUSD: null,
        trustedPriceUSD: null,
        marketPriceUSD: null,
        valueUSD: null,
        priceConfidence: 'unknown',
        liquidityUsd: 0,
        trustedLiquidityUsd: null,
        largestTrustedPoolLiquidityUsd: null,
        estimatedSellValueUsd: null,
        classificationTier: blocked ? 'blocked' : 'hidden',
        classificationReasons: addReason(token.classificationReasons, UNLISTED_REASON),
        recognitionStatus: 'unverified',
        recognitionReasons: addReason(token.recognitionReasons, UNLISTED_REASON),
        verificationStatus: 'unverified',
        verificationReasons: addReason(token.verificationReasons, UNLISTED_REASON),
        spamStatus: blocked ? token.spamStatus : 'unknown',
        possibleSpam: blocked ? token.possibleSpam : null,
        verifiedContract: blocked ? token.verifiedContract : null,
        securityStatus: blocked ? 'blocked' : 'unknown',
        securityReasons: addReason(token.securityReasons, UNLISTED_REASON),
        visibility: 'hidden',
        visibilityReasons: addReason(token.visibilityReasons, UNLISTED_REASON),
        includeInPortfolioValue: false,
    }
}

function wrapWalletPriceCache(cache: WalletPriceCache): WalletPriceCache {
    return new Proxy(cache, {
        get(target, property, receiver) {
            if (property === 'enrichWalletTokens') {
                return async (
                    ...args: Parameters<WalletPriceCache['enrichWalletTokens']>
                ) => {
                    const tokens = await target.enrichWalletTokens(...args)
                    return tokens.map(enforceShapeShiftPolicy)
                }
            }
            const value = Reflect.get(target, property, receiver)
            return typeof value === 'function' ? value.bind(target) : value
        },
    })
}

export function createDexScreenerWalletPriceCache(
    ...args: Parameters<typeof createBaseWalletPriceCache>
) {
    return wrapWalletPriceCache(createBaseWalletPriceCache(...args))
}

export const dexScreenerWalletPriceCache = createDexScreenerWalletPriceCache()
