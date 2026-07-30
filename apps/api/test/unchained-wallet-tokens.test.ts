import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCatalog: vi.fn(),
}))

vi.mock('../src/modules/market-tokens.js', () => ({
    marketCatalogService: {
        getCatalog: mocks.getCatalog,
    },
}))

import {
    clearUnchainedWalletCacheForTest,
    getUnchainedWalletTokens,
    normalizeUnchainedAccount,
} from '../src/providers/unchained/wallet-tokens.js'

const wallet = '0x1000000000000000000000000000000000000042'
const token = '0x2000000000000000000000000000000000000042'

describe('Unchained account normalization', () => {
    const previousEnv = { ...process.env }

    beforeEach(() => {
        vi.clearAllMocks()
        clearUnchainedWalletCacheForTest()
        process.env.UNCHAINED_ENABLED = 'true'
        process.env.UNCHAINED_HTTP_URL_56 = 'http://127.0.0.1:9999'
        process.env.UNCHAINED_REQUEST_TIMEOUT_MS = '1000'
        mocks.getCatalog.mockResolvedValue({
            catalog: { generatedAt: Date.now(), tokens: [], commonTokens: [] },
            stale: false,
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        process.env = { ...previousEnv }
    })

    it('normalizes native and ERC-20 balances', () => {
        expect(normalizeUnchainedAccount({
            balance: '1000000000000000000',
            unconfirmedBalance: '0',
            nonce: 1,
            pubkey: wallet.toUpperCase(),
            tokens: [
                {
                    balance: '2500000',
                    contract: token.toUpperCase(),
                    decimals: 6,
                    name: 'USD Coin',
                    symbol: 'USDC',
                    type: 'ERC20',
                },
            ],
        })).toEqual({
            balance: 1000000000000000000n,
            pubkey: wallet,
            tokens: [
                {
                    balance: 2500000n,
                    contract: token,
                    decimals: 6,
                    name: 'USD Coin',
                    symbol: 'USDC',
                },
            ],
        })
    })

    it('normalizes nested official account responses', () => {
        expect(normalizeUnchainedAccount({
            account: {
                balance: '0',
                pubkey: wallet.toUpperCase(),
                tokens: [],
            },
        })).toEqual({
            balance: 0n,
            pubkey: wallet,
            tokens: [],
        })
    })

    it('accepts zero native balance with positive ERC-20 balances', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            balance: '0',
            pubkey: wallet.toUpperCase(),
            tokens: [{
                balance: '42',
                contract: token,
                decimals: 18,
                name: 'Token',
                symbol: 'TOK',
            }],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })))

        const result = await getUnchainedWalletTokens({
            walletAddress: wallet.toUpperCase(),
            chainIds: [56],
        })

        expect(result.successfulChainIds).toEqual([56])
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0].address).toBe(token)
    })

    it('accepts a legitimate empty wallet when includeZero is false', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            balance: '0',
            pubkey: wallet,
            tokens: [],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })))

        const result = await getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })

        expect(result.successfulChainIds).toEqual([56])
        expect(result.tokens).toHaveLength(0)
    })

    it('classifies unknown holdings into the hidden token section', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            balance: '0',
            pubkey: wallet,
            tokens: [
                {
                    balance: '1000000000000000000',
                    contract: token,
                    decimals: 18,
                    name: 'Mystery Token',
                    symbol: 'MYSTERY',
                    type: 'ERC20',
                },
            ],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })))

        const result = await getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })

        expect(result.source).toBe('unchained')
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0]).toMatchObject({
            address: token,
            recognitionStatus: 'unverified',
            classificationTier: 'hidden',
            visibility: 'unverified',
            includeInPortfolioValue: false,
            possibleSpam: null,
        })
    })

    it('drops malformed token rows without rejecting the account', () => {
        const account = normalizeUnchainedAccount({
            balance: '0',
            pubkey: wallet,
            tokens: [
                {
                    balance: '-1',
                    contract: token,
                    decimals: 18,
                    name: 'Bad balance',
                    symbol: 'BAD',
                },
                {
                    balance: '1',
                    contract: 'not-an-address',
                    decimals: 18,
                    name: 'Bad address',
                    symbol: 'BAD',
                },
            ],
        })
        expect(account).toEqual({
            balance: 0n,
            pubkey: wallet,
            tokens: [],
        })
    })

    it('rejects malformed account payloads', () => {
        expect(normalizeUnchainedAccount(null)).toBeNull()
        expect(normalizeUnchainedAccount({
            balance: 'not-a-balance',
            pubkey: wallet,
            tokens: [],
        })).toBeNull()
        expect(normalizeUnchainedAccount({
            balance: '0',
            pubkey: 'not-an-address',
            tokens: [],
        })).toBeNull()
    })

    it('reports connection refused with a safe diagnostic', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
        }))

        await expect(getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })).rejects.toMatchObject({
            code: 'UNCHAINED_WALLET_UNAVAILABLE',
            providers: [expect.objectContaining({
                code: '56:UNCHAINED_CONNECTION_REFUSED',
            })],
        })
    })

    it('reports timeout with a safe diagnostic', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new DOMException('The operation timed out.', 'TimeoutError')
        }))

        await expect(getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })).rejects.toMatchObject({
            providers: [expect.objectContaining({ code: '56:UNCHAINED_TIMEOUT' })],
        })
    })

    it('rejects malformed JSON without logging payload data', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{bad json', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })))

        await expect(getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })).rejects.toMatchObject({
            providers: [expect.objectContaining({ code: '56:UNCHAINED_INVALID_JSON' })],
        })
    })

    it('fails a chain for wallet-address mismatch using canonical address comparison', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            balance: '0',
            pubkey: token,
            tokens: [],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })))

        await expect(getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [56],
        })).rejects.toMatchObject({
            providers: [expect.objectContaining({ code: '56:UNCHAINED_WALLET_ADDRESS_MISMATCH' })],
        })
    })

    it('keeps successful chains when one chain fails', async () => {
        process.env.UNCHAINED_HTTP_URLS_JSON = JSON.stringify({
            56: 'http://127.0.0.1:9999',
            1: 'http://127.0.0.1:9998',
        })
        vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
            if (String(url).includes(':9998')) {
                throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
            }
            return new Response(JSON.stringify({
                balance: '0',
                pubkey: wallet,
                tokens: [],
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })
        }))

        const result = await getUnchainedWalletTokens({
            walletAddress: wallet,
            chainIds: [1, 56],
        })

        expect(result.successfulChainIds).toEqual([56])
        expect(result.failedChainIds).toEqual([1])
        expect(result.chainErrors['1']).toContain('UNCHAINED_CONNECTION_REFUSED')
    })

    it('opens a circuit after repeated connection failures and deduplicates concurrent requests', async () => {
        const fetch = vi.fn(async () => {
            throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
        })
        vi.stubGlobal('fetch', fetch)

        await expect(getUnchainedWalletTokens({ walletAddress: wallet, chainIds: [56] }))
            .rejects.toMatchObject({ code: 'UNCHAINED_WALLET_UNAVAILABLE' })
        await expect(getUnchainedWalletTokens({ walletAddress: wallet, chainIds: [56] }))
            .rejects.toMatchObject({ code: 'UNCHAINED_WALLET_UNAVAILABLE' })
        await expect(getUnchainedWalletTokens({ walletAddress: wallet, chainIds: [56] }))
            .rejects.toMatchObject({
                providers: [expect.objectContaining({ code: '56:UNCHAINED_CIRCUIT_OPEN' })],
            })
        expect(fetch).toHaveBeenCalledTimes(4)

        clearUnchainedWalletCacheForTest()
        fetch.mockImplementation(async () => new Response(JSON.stringify({
            balance: '0',
            pubkey: wallet,
            tokens: [],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        }))
        await Promise.all([
            getUnchainedWalletTokens({ walletAddress: wallet, chainIds: [56] }),
            getUnchainedWalletTokens({ walletAddress: wallet, chainIds: [56] }),
        ])
        expect(fetch).toHaveBeenCalledTimes(5)
    })
})
