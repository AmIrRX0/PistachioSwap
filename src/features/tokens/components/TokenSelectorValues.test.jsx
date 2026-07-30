// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TokenRow } from './TokenSelectorPrimitives.jsx'
import { TokenSelectorSections } from './TokenSelectorSections.jsx'

const marketToken = {
    id: '56:0x0000000000000000000000000000000000000001',
    chainId: 56,
    address: '0x0000000000000000000000000000000000000001',
    name: 'Market Token',
    symbol: 'MARKET',
    decimals: 18,
    priceUSD: '0.012345',
    recognitionStatus: 'established',
    verificationStatus: 'established',
    possibleSpam: false,
    securityStatus: 'low',
    visibility: 'primary',
}

const ownedToken = {
    ...marketToken,
    id: '56:0x0000000000000000000000000000000000000002',
    address: '0x0000000000000000000000000000000000000002',
    name: 'Owned Token',
    symbol: 'OWNED',
    balance: '2.5',
    valueUSD: '10101.775',
    priceConfidence: 'market',
}

function emptySelectorState() {
    return {
        primaryWalletTokens: [],
        selectedHiddenTokens: [],
        riskyWalletTokens: [],
        visibleRecentTokens: [],
        sortedGlobalMarketTokens: [],
        commonMarketTokens: [],
        showHiddenTokens: false,
        toggleHiddenTokens: vi.fn(),
        clearRecentTokens: vi.fn(),
        handleSelect: vi.fn(),
        openContextMenu: vi.fn(),
    }
}

afterEach(cleanup)

describe('token selector values and fallback copy', () => {
    it('does not show a standalone market price for an unowned token', () => {
        render(
            <TokenRow
                token={marketToken}
                currentToken={null}
                oppositeToken={null}
                onSelect={vi.fn()}
                onContextMenu={vi.fn()}
            />,
        )

        expect(screen.queryByText('$0.0123')).toBeNull()
    })

    it('shows total wallet value and token quantity only for an owned token', () => {
        render(
            <TokenRow
                token={ownedToken}
                currentToken={null}
                oppositeToken={null}
                showBalance
                onSelect={vi.fn()}
                onContextMenu={vi.fn()}
            />,
        )

        expect(screen.getByText('$10,101.78')).toBeTruthy()
        expect(screen.getByText('2.5')).toBeTruthy()
    })

    it('uses one compact generic message when the 24-hour token list is unavailable', () => {
        render(
            <TokenSelectorSections
                state={emptySelectorState()}
                loading={false}
                currentToken={null}
                oppositeToken={null}
                hideUnknownTokens
            />,
        )

        expect(screen.getByText("Token data couldn't be reached.")).toBeTruthy()
    })
})
