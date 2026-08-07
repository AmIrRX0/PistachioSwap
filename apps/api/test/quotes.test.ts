import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProviderError } from '../src/lib/errors.js'
import {
    createQuoteSelector,
    selectBestQuote,
} from '../src/features/quotes/services/quote-selector.js'
import {
    normalizeTransaction,
    validateQuoteRequest,
} from '../src/features/quotes/schemas/quote-utils.js'
import type {
    NormalizedQuote,
    QuoteProvider,
    QuoteProviderName,
} from '../src/features/quotes/types/types.js'

const tokenA = '0x0000000000000000000000000000000000000001'
const tokenB = '0x0000000000000000000000000000000000000002'
const wallet = '0x0000000000000000000000000000000000000004'

const quoteRequest = {
    chainId: 56,
    sellToken: tokenA,
    buyToken: tokenB,
    mode: 'EXACT_INPUT',
    sellAmount: '100',
    buyAmount: null,
    sellTokenDecimals: 18,
    buyTokenDecimals: 18,
    takerAddress: wallet,
    slippageBps: 50,
} as const

function quote(
    providerName: QuoteProviderName,
    buyAmount: string,
    fee: NormalizedQuote['platformFee'] = { amount: '0', token: null, bps: 0 },
): NormalizedQuote {
    return {
        provider: providerName,
        billingMode: fee.bps > 0 ? 'provider-integrator' : 'normal-provider-fee',
        quoteId: providerName,
        chainId: 56,
        sellToken: tokenA,
        buyToken: tokenB,
        mode: 'EXACT_INPUT',
        sellAmount: '100',
        buyAmount,
        minimumBuyAmount: (BigInt(buyAmount) - 1n).toString(),
        maximumSellAmount: '100',
        estimatedGas: '100000',
        estimatedGasUsd: null,
        allowanceTarget: tokenA,
        approval: null,
        transaction: {
            to: tokenA,
            data: '0x1234',
            value: '0',
        },
        platformFee: fee,
        route: [],
        permitData: null,
        executable: true,
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
    }
}

function provider(
    name: QuoteProviderName,
    result: NormalizedQuote | Error,
): QuoteProvider {
    return {
        name,
        supportsChain: (chainId) => chainId === 56,
        supportsQuoteMode: (mode) => mode === 'EXACT_INPUT',
        getQuote: async () => {
            if (result instanceof Error) throw result
            return result
        },
        healthCheck: async () => true,
    }
}

describe.sequential('quote normalization and provider selection', () => {
    const previousEnv = { ...process.env }

    beforeEach(() => {
        process.env = { ...previousEnv }
        process.env.QUOTE_PROVIDER_MODE = 'best'
        process.env.QUOTE_PROVIDERS = 'uniswap,0x,kyberswap'
        process.env.UNISWAP_ENABLED = 'true'
        process.env.ZEROX_ENABLED = 'true'
        process.env.KYBERSWAP_ENABLED = 'true'
        process.env.PLATFORM_FEE_BPS = '67'
        process.env.FEE_COLLECTION_MODE = 'provider-affiliate'
        process.env.ZEROX_API_KEY = 'test-zero-x-key'
        process.env.UNISWAP_API_KEY = 'test-uniswap-key'
        process.env.TREASURY_ADDRESS = '0x0000000000000000000000000000000000000003'
    })

    afterEach(() => {
        process.env = { ...previousEnv }
    })

    it('normalizes provider transaction hex quantities', () => {
        expect(normalizeTransaction({
            to: tokenA,
            data: '0x1234',
            value: '0x10',
            gas: '0x5208',
        })).toEqual({
            to: tokenA,
            data: '0x1234',
            value: '16',
            gas: '21000',
        })
    })

    it('accepts quote slippage through 100 percent', () => {
        expect(validateQuoteRequest({
            ...quoteRequest,
            slippageBps: 10_000,
        }).slippageBps).toBe(10_000)
        expect(() => validateQuoteRequest({
            ...quoteRequest,
            slippageBps: 10_001,
        })).toThrow('valid slippage')
    })

    it('allows normal providers to use their documented fee denomination', async () => {
        const uniswap = quote('uniswap', '104', {
            amount: '1',
            token: tokenB,
            bps: 67,
        })
        const zeroX = quote('0x', '103', {
            amount: '1',
            token: tokenA,
            bps: 67,
        })
        const kyber = quote('kyberswap', '102', {
            amount: '1',
            token: tokenA,
            bps: 67,
        })
        const select = createQuoteSelector([
            provider('uniswap', uniswap),
            provider('0x', zeroX),
            provider('kyberswap', kyber),
        ])

        const result = await select(quoteRequest)
        expect(result.providers.filter((item) => item.status === 'fulfilled')).toHaveLength(3)
        expect(result.selectedQuote.provider).toBe('uniswap')
        expect(result.selectedQuote.platformFee.token).toBe(tokenB)
    })

    it('keeps a valid provider when another provider fails', async () => {
        const select = createQuoteSelector([
            provider('uniswap', new ProviderError({
                code: 'UNISWAP_TIMEOUT',
                message: 'Uniswap timed out.',
                outcome: 'timeout',
            })),
            provider('0x', quote('0x', '101')),
        ])

        const result = await select(quoteRequest)
        expect(result.selectedQuote.provider).toBe('0x')
        expect(result.providers).toEqual(expect.arrayContaining([
            expect.objectContaining({
                provider: 'uniswap',
                status: 'rejected',
                category: 'timeout',
            }),
        ]))
    })

    it('selects the highest guaranteed output for otherwise comparable exact-input quotes', () => {
        expect(selectBestQuote([
            quote('uniswap', '100'),
            quote('0x', '103'),
            quote('kyberswap', '101'),
        ]).provider).toBe('0x')
    })

    it('rejects malformed provider output while retaining a valid alternative', async () => {
        const bad = quote('uniswap', '0')
        const select = createQuoteSelector([
            provider('uniswap', bad),
            provider('0x', quote('0x', '101')),
        ])

        const result = await select(quoteRequest)
        expect(result.selectedQuote.provider).toBe('0x')
        expect(result.providers).toEqual(expect.arrayContaining([
            expect.objectContaining({
                provider: 'uniswap',
                category: 'malformed-or-unsafe-quote',
            }),
        ]))
    })
})
