import { getApiConfig } from '../../../config.js'
import { NATIVE_TOKEN_ADDRESS } from '../../../lib/address.js'
import {
    ProviderError,
    type ProviderDiagnostic,
} from '../../../lib/errors.js'
import {
    getNativeTokenPrice,
    getTokenPrices,
} from '../../../providers/alchemy/token-prices.js'
import { createPancakeSwapProvider } from '../providers/pancakeswap-provider.js'
import { createKyberSwapProvider } from '../providers/kyberswap-provider.js'
import { assertNormalizedQuote } from '../schemas/quote-utils.js'
import type {
    NormalizedQuote,
    QuoteProvider,
    QuoteRequest,
    QuoteSelection,
    QuoteSummary,
} from '../types/types.js'
import { createUniswapProvider } from '../providers/uniswap-provider.js'
import { createZeroXProvider } from '../providers/zero-x-provider.js'

function withTimeout(
    provider: QuoteProvider,
    request: QuoteRequest,
    timeoutMs: number,
    signal?: AbortSignal,
) {
    const timeout = AbortSignal.timeout(timeoutMs)
    const combined = signal
        ? AbortSignal.any([signal, timeout])
        : timeout
    return provider.getQuote(request, combined)
}

type QuoteFailureCategory = NonNullable<QuoteSummary['category']>

function providerMessage(error: ProviderError | null, fallback: unknown) {
    return error?.message ??
        (fallback instanceof Error
            ? fallback.message
            : 'Provider failed without a safe diagnostic.')
}

function normalizedFailureCategory(
    error: ProviderError | null,
    fallback: unknown,
): QuoteFailureCategory {
    const code = String(error?.code ?? '').toUpperCase()
    const message = providerMessage(error, fallback).toLowerCase()
    const combined = `${code} ${message}`

    if (/minimum|too small|below min|notional|amount.*low/.test(combined)) {
        return 'amount-below-provider-minimum'
    }
    if (error?.outcome === 'timeout' || /timeout|timed out/.test(combined)) {
        return 'timeout'
    }
    if (error?.outcome === 'rate-limit') return 'rate-limited'
    if (
        /legal restriction|not authorized for trade|sell_token_not_authorized|unsupported token|unsupported pair/.test(
            combined,
        )
    ) {
        return 'unsupported-token'
    }
    if (error?.outcome === 'no-route') {
        return /unsupported|not supported|invalid token/.test(combined)
            ? 'unsupported-token'
            : /liquidity/.test(combined)
              ? 'no-liquidity'
              : 'no-route'
    }
    if (error?.outcome === 'validation') {
        return /unsupported|not supported|invalid token|unsupported token|unsupported pair/.test(combined)
            ? 'unsupported-token'
            : 'malformed-or-unsafe-quote'
    }
    if (error?.outcome === 'configuration' || error?.outcome === 'authentication') {
        return 'configuration-error'
    }
    if (/malformed|invalid quote|unsafe|transaction invalid|calldata/.test(combined)) {
        return 'malformed-or-unsafe-quote'
    }
    return 'temporary-failure'
}

function providerMinimumInputUsd(error: ProviderError | null) {
    const value = (error as unknown as { minimumInputAmountUsd?: unknown } | null)
        ?.minimumInputAmountUsd
    return typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)
        ? value
        : null
}

function finalNoRouteMessage(diagnostics: ProviderDiagnostic[]) {
    const categories = diagnostics
        .filter((item) => item.category !== 'skipped-not-eligible')
        .map((item) => item.category)
    if (
        categories.length > 0 &&
        categories.every((category) => category === 'amount-below-provider-minimum')
    ) {
        const minimums = diagnostics
            .map((item) => item.minimumInputAmountUsd)
            .filter((value): value is string => Boolean(value))
        const minimum = minimums.length > 0
            ? minimums.sort((left, right) => Number(left) - Number(right))[0]
            : null
        return minimum
            ? `This amount is too small for the available providers. Minimum available amount is approximately $${minimum}.`
            : 'This amount is too small for the available providers.'
    }
    if (
        categories.length > 0 &&
        categories.every((category) =>
            category === 'no-route' ||
            category === 'no-liquidity' ||
            category === 'unsupported-token',
        )
    ) {
        return 'No route is currently available for this token pair.'
    }
    if (
        categories.length > 0 &&
        categories.every((category) =>
            category === 'timeout' ||
            category === 'rate-limited' ||
            category === 'temporary-failure',
        )
    ) {
        return 'Quote providers are temporarily unavailable. Try again.'
    }
    return 'No executable route was found for this amount.'
}

export function selectBestQuote(quotes: NormalizedQuote[]) {
    if (quotes.length === 0) {
        throw new ProviderError({
            code: 'NO_ROUTE_AVAILABLE',
            message: 'No enabled provider returned a valid route.',
            statusCode: 503,
            outcome: 'no-route',
        })
    }

    return [...quotes].sort((left, right) => {
        if (left.mode === 'EXACT_OUTPUT' || right.mode === 'EXACT_OUTPUT') {
            const leftGross = BigInt(left.maximumSellAmount)
            const rightGross = BigInt(right.maximumSellAmount)
            if (leftGross === rightGross) return 0
            return leftGross < rightGross ? -1 : 1
        }
        const leftNet = BigInt(left.minimumBuyAmount ?? left.buyAmount)
        const rightNet = BigInt(right.minimumBuyAmount ?? right.buyAmount)
        if (leftNet === rightNet) return 0
        return leftNet > rightNet ? -1 : 1
    })[0]
}

function decimalToScaled(value: string, scale: number) {
    const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/)
    if (!match) return null
    const fraction = (match[2] ?? '').slice(0, scale).padEnd(scale, '0')
    return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt(fraction || '0')
}

function usdCostToTokenRaw({
    costUsd,
    tokenPriceUsd,
    tokenDecimals,
}: {
    costUsd: string | null
    tokenPriceUsd: string | null
    tokenDecimals: number
}) {
    if (!costUsd || !tokenPriceUsd) return null
    const scale = 12
    const cost = decimalToScaled(costUsd, scale)
    const price = decimalToScaled(tokenPriceUsd, scale)
    if (cost === null || price === null || price <= 0n) return null
    const tokenScale = 10n ** BigInt(tokenDecimals)
    return (cost * tokenScale + price - 1n) / price
}

async function tokenUsdPrice(
    request: QuoteRequest,
    side: 'sell' | 'buy',
    signal?: AbortSignal,
) {
    const token = side === 'sell' ? request.sellToken : request.buyToken
    if (token === NATIVE_TOKEN_ADDRESS) {
        return getNativeTokenPrice(request.chainId, signal)
    }
    const prices = await getTokenPrices({
        chainId: request.chainId,
        addresses: [token],
        signal,
    })
    return prices.get(token.toLowerCase()) ?? prices.get(token) ?? null
}

export async function selectBestQuoteByTotalCost(
    quotes: NormalizedQuote[],
    request: QuoteRequest,
    signal?: AbortSignal,
) {
    if (quotes.length === 0) return selectBestQuote(quotes)

    const side = request.mode === 'EXACT_OUTPUT' ? 'sell' : 'buy'
    const decimals = side === 'sell'
        ? request.sellTokenDecimals
        : request.buyTokenDecimals
    let priceUsd: string | null = null
    try {
        priceUsd = await tokenUsdPrice(request, side, signal)
    } catch {
        priceUsd = null
    }

    return [...quotes].sort((left, right) => {
        const leftGas = usdCostToTokenRaw({
            costUsd: left.estimatedGasUsd,
            tokenPriceUsd: priceUsd,
            tokenDecimals: decimals,
        })
        const rightGas = usdCostToTokenRaw({
            costUsd: right.estimatedGasUsd,
            tokenPriceUsd: priceUsd,
            tokenDecimals: decimals,
        })

        if (request.mode === 'EXACT_OUTPUT') {
            const leftSell = BigInt(left.maximumSellAmount) + (leftGas ?? 0n)
            const rightSell = BigInt(right.maximumSellAmount) + (rightGas ?? 0n)
            if (leftSell !== rightSell) return leftSell < rightSell ? -1 : 1
        } else {
            const leftOutput = BigInt(left.minimumBuyAmount)
            const rightOutput = BigInt(right.minimumBuyAmount)
            const leftEffective = leftGas === null || leftGas >= leftOutput
                ? leftOutput
                : leftOutput - leftGas
            const rightEffective = rightGas === null || rightGas >= rightOutput
                ? rightOutput
                : rightOutput - rightGas
            if (leftEffective !== rightEffective) {
                return leftEffective > rightEffective ? -1 : 1
            }
        }

        const leftKnownGas = left.estimatedGasUsd !== null
        const rightKnownGas = right.estimatedGasUsd !== null
        if (leftKnownGas !== rightKnownGas) return leftKnownGas ? -1 : 1
        return selectBestQuote([left, right]) === left ? -1 : 1
    })[0]
}

export function createQuoteSelector(
    providedProviders?: QuoteProvider[],
) {
    const config = getApiConfig()
    const providers =
        providedProviders ??
        [
            createUniswapProvider(),
            createKyberSwapProvider(),
            createZeroXProvider(),
            createPancakeSwapProvider(),
        ]
    const enabledProviderNames = new Set(config.quotes.providers)
    const considered = providers.filter((provider) => {
        const kyberEnabled = provider.name === 'kyberswap' &&
            process.env.KYBERSWAP_ENABLED?.trim().toLowerCase() !== 'false'
        if (!kyberEnabled && !enabledProviderNames.has(provider.name)) return false
        return (
            config.quotes.mode === 'best' ||
            provider.name === config.quotes.mode
        )
    })

    function providerEnabled(provider: QuoteProvider) {
        if (provider.name === 'uniswap') return config.quotes.uniswap.enabled
        if (provider.name === '0x') return config.quotes.zeroX.enabled
        if (provider.name === 'kyberswap') {
            return process.env.KYBERSWAP_ENABLED?.trim().toLowerCase() !== 'false'
        }
        return config.quotes.pancakeSwap.enabled
    }

    return async function selectQuotes(
        request: QuoteRequest,
        signal?: AbortSignal,
    ): Promise<QuoteSelection> {
        const mode = request.mode ?? 'EXACT_INPUT'
        const eligibility = considered.map((provider) => {
            const reason = !providerEnabled(provider)
                ? 'PROVIDER_DISABLED'
                : !provider.supportsChain(request.chainId)
                  ? 'CHAIN_NOT_SUPPORTED'
                  : !provider.supportsQuoteMode(mode)
                    ? 'QUOTE_MODE_NOT_SUPPORTED'
                    : null
            return { provider, reason }
        })
        const compatible = eligibility
            .filter((item) => item.reason === null)
            .map((item) => item.provider)
        const skipped = eligibility.filter((item) => item.reason !== null)
        const skippedSummaries = skipped.map(({ provider, reason }) => ({
            provider: provider.name,
            status: 'skipped' as const,
            category: 'skipped-not-eligible' as const,
            buyAmount: null,
            minimumBuyAmount: null,
            maximumSellAmount: null,
            estimatedGasUsd: null,
            platformFee: null,
            minimumInputAmountUsd: null,
            retryable: false,
            error: reason,
        }))
        const skippedDiagnostics: ProviderDiagnostic[] = skipped.map(({
            provider,
            reason,
        }) => ({
            provider: provider.name,
            outcome: 'configuration',
            category: 'skipped-not-eligible',
            upstreamStatus: null,
            code: reason,
            message: 'Provider is not eligible for the current quote request.',
            minimumInputAmountUsd: null,
            retryable: false,
        }))
        if (compatible.length === 0) {
            throw new ProviderError({
                code: 'QUOTE_MODE_UNSUPPORTED',
                message: mode === 'EXACT_OUTPUT'
                    ? 'Exact output is not supported for this route.'
                    : 'No enabled provider supports this quote mode.',
                statusCode: 400,
                outcome: 'configuration',
                providers: skippedDiagnostics,
            })
        }
        const settled = await Promise.allSettled(
            compatible.map((provider) =>
                withTimeout(
                    provider,
                    request,
                    config.quotes.timeoutMs,
                    signal,
                ).then(assertNormalizedQuote),
            ),
        )
        const quotes: NormalizedQuote[] = []
        const diagnostics: ProviderDiagnostic[] = []
        const summaries: QuoteSummary[] = settled.map((result, index) => {
            const provider = compatible[index]
            if (result.status === 'fulfilled') {
                quotes.push(result.value)
                return {
                    provider: provider.name,
                    status: 'fulfilled',
                    category: 'valid-route',
                    buyAmount: result.value.buyAmount,
                    minimumBuyAmount: result.value.minimumBuyAmount,
                    maximumSellAmount: result.value.maximumSellAmount,
                    estimatedGasUsd: result.value.estimatedGasUsd,
                    platformFee: result.value.platformFee,
                    minimumInputAmountUsd: null,
                    retryable: false,
                    error: null,
                }
            }

            const providerError = result.reason instanceof ProviderError
                ? result.reason
                : null
            const category = normalizedFailureCategory(providerError, result.reason)
            const minimumInputAmountUsd = providerMinimumInputUsd(providerError)
            diagnostics.push({
                provider: provider.name,
                outcome: providerError?.outcome ?? 'upstream',
                category,
                upstreamStatus: providerError?.upstreamStatus ?? null,
                code: providerError?.code ?? null,
                message:
                    providerMessage(providerError, result.reason).slice(0, 240),
                minimumInputAmountUsd,
                retryable: providerError?.retryable ?? false,
            })

            return {
                provider: provider.name,
                status: 'rejected',
                category,
                buyAmount: null,
                minimumBuyAmount: null,
                maximumSellAmount: null,
                estimatedGasUsd: null,
                platformFee: null,
                minimumInputAmountUsd,
                retryable: providerError?.retryable ?? false,
                error:
                    providerError
                        ? providerError.code
                        : 'PROVIDER_FAILED',
            }
        })

        const summaryByProvider = new Map(summaries.map((summary) => [
            summary.provider,
            summary,
        ]))
        for (const summary of skippedSummaries) {
            summaryByProvider.set(summary.provider, summary)
        }
        const allSummaries = considered.map((provider) =>
            summaryByProvider.get(provider.name)!,
        )
        const allDiagnostics = [...diagnostics, ...skippedDiagnostics]

        if (quotes.length === 0) {
            throw new ProviderError({
                code: 'NO_ROUTE_AVAILABLE',
                message: finalNoRouteMessage(allDiagnostics),
                statusCode: 503,
                outcome: 'no-route',
                providers: allDiagnostics,
            })
        }

        return {
            approvalSchemaVersion: 1,
            selectedQuote: await selectBestQuoteByTotalCost(quotes, request, signal),
            providers: allSummaries,
        }
    }
}
