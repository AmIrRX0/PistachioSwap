// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    fetchThirdwebChainActivities,
    thirdwebWalletHistoryInternals,
} from './thirdwebWalletHistory.js'

const wallet = '0x0000000000000000000000000000000000000001'

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
    })
}

describe('thirdweb browser wallet history fallback', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it('uses Insight plus client-side RPC without touching Pistachio API', async () => {
        vi.stubEnv('VITE_WALLET_HISTORY_THIRDWEB_CLIENT_ID', 'frontend-client-id')
        const urls = []
        const fetchMock = vi.fn(async (input, options = {}) => {
            const url = String(input)
            urls.push(url)
            expect(url).not.toContain('pistachioswap.com/api')

            if (url.startsWith('https://insight.thirdweb.com/')) {
                expect(options.headers['x-client-id']).toBe('frontend-client-id')
                const parsed = new URL(url)
                expect(parsed.searchParams.getAll('chain_id')).toEqual(['5000'])
                return jsonResponse({
                    data: [],
                    meta: { page: 0, limit: 100, total_items: 0, total_pages: 0 },
                })
            }

            expect(url).toBe('https://5000.rpc.thirdweb.com/frontend-client-id')
            const request = JSON.parse(options.body)
            expect(request.method).toBe('eth_blockNumber')
            return jsonResponse({
                jsonrpc: '2.0',
                id: request.id,
                result: '0x64',
            })
        })
        vi.stubGlobal('fetch', fetchMock)

        const result = await fetchThirdwebChainActivities({
            chainId: 5000,
            walletAddress: wallet,
        })

        expect(result).toMatchObject({
            activities: [],
            latestBlock: 100,
            truncated: false,
            source: 'thirdweb-browser',
        })
        const walletRequest = urls
            .map(url => new URL(url))
            .find(url => url.pathname === `/v1/wallets/${wallet}/transactions`)
        expect(walletRequest?.origin).toBe('https://insight.thirdweb.com')
        expect(walletRequest?.searchParams.getAll('chain_id')).toEqual(['5000'])
        expect(walletRequest?.searchParams.get('page')).toBe('0')
        expect(walletRequest?.searchParams.get('limit')).toBe('100')
        expect(walletRequest?.searchParams.get('sort_by')).toBe('block_number')
        expect(walletRequest?.searchParams.get('sort_order')).toBe('desc')

        const transferRequest = urls
            .map(url => new URL(url))
            .find(url => url.pathname === '/v1/tokens/transfers')
        expect(transferRequest?.searchParams.getAll('chain_id')).toEqual(['5000'])
        expect(transferRequest?.searchParams.get('owner_address')).toBe(wallet)
        expect(transferRequest?.searchParams.getAll('token_types')).toEqual(['erc20'])
        expect(transferRequest?.searchParams.get('metadata')).toBe('true')
    })

    it('constructs the canonical Insight origin and chain-scoped RPC origin', () => {
        vi.stubEnv('VITE_WALLET_HISTORY_THIRDWEB_CLIENT_ID', 'browser-id')
        expect(thirdwebWalletHistoryInternals.insightOrigin(167000))
            .toBe('https://insight.thirdweb.com')
        expect(thirdwebWalletHistoryInternals.rpcUrl(25))
            .toBe('https://25.rpc.thirdweb.com/browser-id')
    })

    it('preserves current Insight ERC-20 token_metadata evidence', () => {
        const evidence = thirdwebWalletHistoryInternals.tokenEvidence({
            contract_address: '0x0000000000000000000000000000000000000002',
            block_timestamp: '1788750000',
            token_metadata: {
                symbol: 'USDC',
                decimals: 6,
            },
        })

        expect(evidence).toMatchObject({
            rawContract: {
                address: '0x0000000000000000000000000000000000000002',
                decimal: '6',
            },
            asset: 'USDC',
        })
        expect(evidence.metadata.blockTimestamp).toMatch(/^2026-/)
    })

    it('serializes repeated Insight query parameters without comma joining', () => {
        const url = new URL('https://insight.thirdweb.com/v1/tokens/transfers')
        thirdwebWalletHistoryInternals.appendQueryParams(url, {
            chain_id: [5000, 204],
            token_types: ['erc20', 'erc721'],
        })
        expect(url.searchParams.getAll('chain_id')).toEqual(['5000', '204'])
        expect(url.searchParams.getAll('token_types')).toEqual(['erc20', 'erc721'])
    })
})
