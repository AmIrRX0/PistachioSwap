// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TokenSearchResults } from './TokenSelectorSections.jsx'
import { TokenRow } from './TokenSelectorPrimitives.jsx'

const heldToken = {
    classificationVersion: 6,
    id: '56:0x21ca39943e91d704678f5d00b6616650f066f2d3',
    chainId: 56,
    address: '0x21ca39943e91d704678f5d00b6616650f066f2d3',
    isNative: false,
    name: 'Tether Gold Tokens',
    symbol: 'XAUT0',
    decimals: 6,
    rawBalance: '308',
    balance: '0.000308',
    priceUSD: '4058.441558',
    trustedPriceUSD: '4058.441558',
    marketPriceUSD: null,
    valueUSD: '1.25',
    classificationTier: 'established',
    classificationReasons: ['shapeshift-asset-catalog'],
    recognitionStatus: 'established',
    recognitionReasons: ['shapeshift-asset-catalog'],
    verificationStatus: 'established',
    verificationReasons: ['shapeshift-asset-catalog'],
    spamStatus: 'clean',
    possibleSpam: false,
    verifiedContract: true,
    securityStatus: 'trusted',
    securityReasons: ['shapeshift-asset-catalog'],
    visibility: 'primary',
    visibilityReasons: ['shapeshift-asset-catalog'],
    priceConfidence: 'trusted',
    includeInPortfolioValue: true,
    logoURI: '/icons/token-fallback.svg',
    logoCandidates: ['/icons/token-fallback.svg'],
}

const callbacks = {
    currentToken: null,
    oppositeToken: null,
    onSelect: vi.fn(),
    onContextMenu: vi.fn(),
}

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('token selector wallet search presentation', () => {
    it('shows USD value and quantity for a legitimate held search result', () => {
        render(
            <TokenSearchResults
                loading={false}
                error={null}
                tokens={[heldToken]}
                {...callbacks}
            />,
        )

        const row = screen.getByText('Tether Gold Tokens', { selector: 'strong' })
            .closest('.ps-token-row')
        const value = row.querySelector('.ps-token-row-value')
        expect(value.children[0].textContent).toBe('$1.25')
        expect(value.children[1].textContent).toBe('0.000308')
    })

    it('does not show low-liquidity warnings on a normal trusted row', () => {
        render(
            <TokenRow
                token={{
                    ...heldToken,
                    classificationReasons: [
                        'shapeshift-asset-catalog',
                        'insufficient-trusted-liquidity',
                    ],
                }}
                showBalance
                {...callbacks}
            />,
        )

        const row = screen.getByText('Tether Gold Tokens', { selector: 'strong' })
            .closest('.ps-token-row')
        expect(within(row).queryByText('Low liquidity')).toBeNull()
    })

    it('keeps a readable low-liquidity warning on an unverified row', () => {
        render(
            <TokenRow
                token={{
                    ...heldToken,
                    classificationTier: 'hidden',
                    classificationReasons: ['insufficient-trusted-liquidity'],
                    recognitionStatus: 'unverified',
                    verificationStatus: 'unverified',
                    securityStatus: 'unknown',
                    visibility: 'hidden',
                    includeInPortfolioValue: false,
                }}
                showBalance
                {...callbacks}
            />,
        )

        const row = screen.getByText('Tether Gold Tokens', { selector: 'strong' })
            .closest('.ps-token-row')
        expect(within(row).getByText('Low liquidity')).toBeTruthy()
    })
})
