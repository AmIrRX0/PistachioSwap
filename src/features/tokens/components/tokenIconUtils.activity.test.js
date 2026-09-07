// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { BNB_CHAIN_LOGO_URI } from '../../../web3/curatedEvmChains.js'
import { getTokenLogoCandidates } from './tokenIconUtils.js'

const bankAddress = '0x1111111111111111111111111111111111111111'

describe('activity token icon metadata reuse', () => {
    afterEach(() => {
        localStorage.clear()
    })

    it('reuses token-selector catalog artwork for a sparse historical token record', () => {
        localStorage.setItem(
            'pistachio-token-catalog-v5:featured:56',
            JSON.stringify({
                tokens: [{
                    chainId: 56,
                    address: bankAddress,
                    symbol: 'BANK',
                    logoURI: 'https://assets.example.test/bank.png',
                    logoCandidates: [
                        'https://assets.example.test/bank.png',
                        'https://assets.example.test/bank-fallback.png',
                    ],
                }],
            }),
        )

        expect(getTokenLogoCandidates({
            chainId: 56,
            address: bankAddress,
            symbol: 'BANK',
        })).toEqual([
            'https://assets.example.test/bank.png',
            'https://assets.example.test/bank-fallback.png',
        ])
    })

    it('uses only the canonical yellow BNB artwork for native BNB', () => {
        expect(getTokenLogoCandidates({
            chainId: 56,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'BNB',
            isNative: true,
            logoURI: '/icons/bnb.svg',
            logoCandidates: ['/networkIcons/bsc.webp'],
        })).toEqual([BNB_CHAIN_LOGO_URI])
    })
})
