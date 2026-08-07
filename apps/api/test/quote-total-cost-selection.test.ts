import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/providers/alchemy/token-prices.js', () => ({
    getNativeTokenPrice: vi.fn(async () => '600'),
    getTokenPrices: vi.fn(async ({ addresses }: { addresses: string[] }) =>
        new Map(addresses.map((address) => [address.toLowerCase(), '1'])),
    ),
}))

import { selectBestQuoteByTotalCost } from '../src/features/quotes/services/quote-selector.js'
import type { NormalizedQuote, QuoteRequest } from '../src/features/quotes/types/types.js'

const sellToken = '0x1111111111111111111111111111111111111111'
const buyToken = '0x2222222222222222222222222222222222222222'
const taker = '0x3333333333333333333333333333333333333333'

const request: QuoteRequest = {
    chainId: 56,
    sellToken,
    buyToken,
    mode: 'EXACT_INPUT',
    sellAmount: '100000000',
    buyAmount: null,
    sellTokenDecimals: 6,
    buyTokenDecimals: 6,
    takerAddress: taker,
    slippageBps: 50,
}

function quote({
    provider,
    minimumBuyAmount,
    estimatedGasUsd,
}: {
    provider: NormalizedQuote['provider']
    minimumBuyAmount: string
    estimatedGasUsd: string | null
}): NormalizedQuote {
    return {
        provider,
        billingMode: 'normal-provider-fee',
        quoteId: `${provider}-quote`,
        chainId: 56,
        sellToken,
        buyToken,
        mode: 'EXACT_INPUT',
        sellAmount: request.sellAmount,
        buyAmount: minimumBuyAmount,
        minimumBuyAmount,
        maximumSellAmount: request.sellAmount,
        estimatedGas: '200000',
        estimatedGasUsd,
        allowanceTarget: '0x4444444444444444444444444444444444444444',
        transaction: {
            to: '0x5555555555555555555555555555555555555555',
            data: '0x12345678',
            value: '0',
            gas: '200000',
        },
        platformFee: { amount: '0', token: null, bps: 0 },
        route: [],
        permitData: null,
        executable: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }
}

describe('same-chain total-cost quote selection', () => {
    beforeEach(() => vi.clearAllMocks())

    it('chooses the route that leaves the user with more value after network gas', async () => {
        const higherRawButExpensive = quote({
            provider: '0x',
            minimumBuyAmount: '100100000',
            estimatedGasUsd: '0.20',
        })
        const lowerRawButCheaper = quote({
            provider: 'kyberswap',
            minimumBuyAmount: '100050000',
            estimatedGasUsd: '0.01',
        })

        const selected = await selectBestQuoteByTotalCost(
            [higherRawButExpensive, lowerRawButCheaper],
            request,
        )

        expect(selected.provider).toBe('kyberswap')
    })

    it('still chooses the larger guaranteed output when its gas-adjusted value is better', async () => {
        const uniswap = quote({
            provider: 'uniswap',
            minimumBuyAmount: '101000000',
            estimatedGasUsd: '0.10',
        })
        const kyber = quote({
            provider: 'kyberswap',
            minimumBuyAmount: '100000000',
            estimatedGasUsd: '0.01',
        })

        const selected = await selectBestQuoteByTotalCost(
            [uniswap, kyber],
            request,
        )

        expect(selected.provider).toBe('uniswap')
    })

    it('does not double-subtract provider or Pistachio fees already reflected in quote output', async () => {
        const withEmbeddedFee = quote({
            provider: 'kyberswap',
            minimumBuyAmount: '100500000',
            estimatedGasUsd: '0.01',
        })
        withEmbeddedFee.platformFee = {
            amount: '670000',
            token: buyToken,
            bps: 67,
            configuredBps: 67,
            effectiveBps: 67,
        }
        const other = quote({
            provider: '0x',
            minimumBuyAmount: '100400000',
            estimatedGasUsd: '0.01',
        })

        const selected = await selectBestQuoteByTotalCost(
            [withEmbeddedFee, other],
            request,
        )

        expect(selected.provider).toBe('kyberswap')
    })
})
