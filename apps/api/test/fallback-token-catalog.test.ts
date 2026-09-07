import { describe, expect, it } from 'vitest'

import {
    getFallbackToken,
    getFallbackTokensForChain,
    loadFallbackTokenCatalog,
    validateFallbackTokenCatalogRecords,
} from '../src/token-discovery/fallback-token-catalog.js'

const record = {
    chainId: 56,
    address: '0x21caef8a43163eea865baee23b9c2e327696a3bf',
    name: 'Tether Gold',
    symbol: 'XAUt',
    decimals: 6,
    logoURI: '/icons/tether-gold.png',
    logoCandidates: ['/icons/tether-gold.png'],
    coinGeckoId: 'tether-gold',
    metadataSources: ['curated-token-list'],
    iconSource: 'local',
    generatedAt: '2026-07-22T00:00:00.000Z',
    catalogSource: 'static-fallback',
    directoryStatus: 'listed',
}

const optimismUsdcRecord = {
    ...record,
    chainId: 10,
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI: '/icons/token-fallback.svg',
    logoCandidates: ['/icons/token-fallback.svg'],
    coinGeckoId: 'usd-coin',
    iconSource: null,
}

describe('fallback token catalog loader', () => {
    it('rejects malformed generated records', () => {
        expect(() => validateFallbackTokenCatalogRecords([{ ...record, symbol: '' }]))
            .toThrow(/invalid metadata/)
    })

    it('rejects duplicate chain/address identities', () => {
        expect(() => validateFallbackTokenCatalogRecords([record, record]))
            .toThrow(/Duplicate fallback token catalog identity/)
    })

    it('returns at most 100 generated tokens per chain', () => {
        const records = Array.from({ length: 101 }, (_, index) => ({
            ...record,
            address: `0x${(index + 1).toString(16).padStart(40, '0')}`,
        }))
        expect(() => validateFallbackTokenCatalogRecords(records))
            .toThrow(/exceeds 100 records/)
    })

    it('adds native and wrapped native at runtime when the static file is empty', async () => {
        await loadFallbackTokenCatalog({ recordsForTest: [] })
        const tokens = await getFallbackTokensForChain(8453)
        expect(tokens.slice(0, 2)).toEqual([
            expect.objectContaining({ symbol: 'ETH', isNative: true }),
            expect.objectContaining({ symbol: 'WETH' }),
        ])
    })

    it('upgrades official fallback-only icons to curated asset logos', async () => {
        await loadFallbackTokenCatalog({ recordsForTest: [optimismUsdcRecord] })
        const token = await getFallbackToken(10, optimismUsdcRecord.address)
        expect(token).toMatchObject({
            symbol: 'USDC',
            iconSource: 'curated',
        })
        expect(token?.logoURI).toContain('raw.githubusercontent.com/trustwallet/assets')
        expect(token?.logoURI).toContain('/blockchains/optimism/assets/')
        expect(token?.logoCandidates[0]).toBe(token?.logoURI)
    })

    it('looks up exact fallback records by normalized address', async () => {
        await loadFallbackTokenCatalog({ recordsForTest: [record] })
        await expect(getFallbackToken(56, '0x21cAef8A43163Eea865baeE23b9C2E327696A3bf'))
            .resolves.toMatchObject({
                catalogSource: 'static-fallback',
                directoryStatus: 'listed',
                catalogSection: 'fallback',
                rank: null,
            })
    })
})
