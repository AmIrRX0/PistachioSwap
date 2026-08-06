import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
    KYBERSWAP_ROUTER_ADDRESS,
    createKyberSwapProvider,
} from '../src/features/quotes/providers/kyberswap-provider.js'
import { NATIVE_TOKEN_ADDRESS } from '../src/lib/address.js'

const usdt = '0x55d398326f99059ff775485246999027b3197955'
const xaut = '0x21caef8a43163eea865baee23b9c2e327696a3bf'
const wallet = '0x0000000000000000000000000000000000000001'
const treasury = '0x0000000000000000000000000000000000000002'

const request = {
    chainId: 56,
    sellToken: usdt,
    buyToken: xaut,
    mode: 'EXACT_INPUT' as const,
    sellAmount: '1000000000000000000',
    buyAmount: null,
    sellTokenDecimals: 18,
    buyTokenDecimals: 6,
    takerAddress: wallet,
    slippageBps: 50,
}

describe.sequential('KyberSwap Aggregator provider', () => {
    const previousEnv = { ...process.env }

    beforeEach(() => {
        process.env = { ...previousEnv }
        process.env.KYBERSWAP_ENABLED = 'true'
        process.env.KYBERSWAP_CLIENT_ID = 'PistachioSwap-test'
        process.env.PLATFORM_FEE_BPS = '67'
        process.env.FEE_COLLECTION_MODE = 'provider-affiliate'
        process.env.FEE_TOKEN_MODE = 'buyToken'
        process.env.TREASURY_ADDRESS = treasury
    })

    afterEach(() => {
        process.env = { ...previousEnv }
        vi.unstubAllGlobals()
    })

    it('requests a fee-aware route and builds calldata against the official router', async () => {
        const routeSummary = {
            tokenIn: usdt,
            tokenOut: xaut,
            amountIn: request.sellAmount,
            amountOut: '240000',
            amountOutUsd: '1000',
            gas: '210000',
            gasUsd: '0.012',
            extraFee: {
                feeAmount: '67',
                chargeFeeBy: 'currency_out',
                isInBps: true,
                feeReceiver: treasury,
            },
            route: [],
            routeID: 'kyber-route-1',
        }
        const fetchMock = vi.fn(async (input, options = {}) => {
            const url = new URL(String(input))
            if (url.pathname.endsWith('/api/v1/routes')) {
                expect(url.pathname).toBe('/bsc/api/v1/routes')
                expect(url.searchParams.get('tokenIn')).toBe(usdt)
                expect(url.searchParams.get('tokenOut')).toBe(xaut)
                expect(url.searchParams.get('feeAmount')).toBe('67')
                expect(url.searchParams.get('chargeFeeBy')).toBe('currency_out')
                expect(url.searchParams.get('feeReceiver')).toBe(treasury)
                expect(options.headers).toMatchObject({
                    'x-client-id': 'PistachioSwap-test',
                })
                return new Response(JSON.stringify({
                    code: 0,
                    data: {
                        routeSummary,
                        routerAddress: KYBERSWAP_ROUTER_ADDRESS,
                    },
                }), { status: 200, headers: { 'content-type': 'application/json' } })
            }

            expect(url.pathname).toBe('/bsc/api/v1/route/build')
            const body = JSON.parse(String(options.body))
            expect(body).toMatchObject({
                routeSummary,
                sender: wallet,
                origin: wallet,
                recipient: wallet,
                slippageTolerance: 50,
                enableGasEstimation: true,
            })
            return new Response(JSON.stringify({
                code: 0,
                data: {
                    amountOut: '240000',
                    gas: '210000',
                    gasUsd: '0.012',
                    routerAddress: KYBERSWAP_ROUTER_ADDRESS,
                    data: '0x1234',
                },
            }), { status: 200, headers: { 'content-type': 'application/json' } })
        })
        vi.stubGlobal('fetch', fetchMock)

        const quote = await createKyberSwapProvider().getQuote(request)

        expect(quote).toMatchObject({
            provider: 'kyberswap',
            billingMode: 'provider-integrator',
            buyAmount: '240000',
            minimumBuyAmount: '238800',
            estimatedGas: '210000',
            estimatedGasUsd: '0.012',
            allowanceTarget: KYBERSWAP_ROUTER_ADDRESS,
            platformFee: {
                bps: 67,
                token: xaut,
            },
            transaction: {
                to: KYBERSWAP_ROUTER_ADDRESS,
                data: '0x1234',
                value: '0',
            },
        })
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('maps native input to KyberSwap native identity and does not require approval', async () => {
        process.env.PLATFORM_FEE_BPS = '0'
        process.env.FEE_COLLECTION_MODE = 'none'
        const nativeRequest = {
            ...request,
            sellToken: NATIVE_TOKEN_ADDRESS,
            sellTokenDecimals: 18,
        }
        const fetchMock = vi.fn(async (input, options = {}) => {
            const url = new URL(String(input))
            if (url.pathname.endsWith('/api/v1/routes')) {
                expect(url.searchParams.get('tokenIn')?.toLowerCase()).toBe(
                    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                )
                return new Response(JSON.stringify({
                    code: 0,
                    data: {
                        routeSummary: {
                            tokenIn: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            tokenOut: xaut,
                            amountIn: nativeRequest.sellAmount,
                            amountOut: '240000',
                            gas: '200000',
                            gasUsd: '0.01',
                            route: [],
                            routeID: 'native-route',
                        },
                        routerAddress: KYBERSWAP_ROUTER_ADDRESS,
                    },
                }), { status: 200, headers: { 'content-type': 'application/json' } })
            }
            expect(JSON.parse(String(options.body))).toMatchObject({ sender: wallet })
            return new Response(JSON.stringify({
                code: 0,
                data: {
                    amountOut: '240000',
                    gas: '200000',
                    gasUsd: '0.01',
                    routerAddress: KYBERSWAP_ROUTER_ADDRESS,
                    data: '0x1234',
                },
            }), { status: 200, headers: { 'content-type': 'application/json' } })
        })
        vi.stubGlobal('fetch', fetchMock)

        const quote = await createKyberSwapProvider().getQuote(nativeRequest)
        expect(quote.allowanceTarget).toBeNull()
        expect(quote.transaction.value).toBe(nativeRequest.sellAmount)
    })

    it('rejects a router address that is not the official KyberSwap router', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            code: 0,
            data: {
                routeSummary: {
                    amountOut: '240000',
                    route: [],
                },
                routerAddress: wallet,
            },
        }), { status: 200, headers: { 'content-type': 'application/json' } })))

        await expect(createKyberSwapProvider().getQuote(request)).rejects.toMatchObject({
            code: 'KYBERSWAP_ROUTER_INVALID',
        })
    })
})
