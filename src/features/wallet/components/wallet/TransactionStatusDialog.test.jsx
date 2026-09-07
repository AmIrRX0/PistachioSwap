// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import TransactionStatusDialog, { blockscanTransactionUrl } from './TransactionStatusDialog.jsx'

const hash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const bnb = {
    chainId: 56,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    isNative: true,
}

describe('TransactionStatusDialog', () => {
    afterEach(cleanup)

    it('uses the multichain Blockscan transaction URL instead of a chain-specific label', () => {
        expect(blockscanTransactionUrl(hash)).toBe(`https://blockscan.com/tx/${hash}`)

        render(<TransactionStatusDialog status="sent" hash={hash} />)
        const link = screen.getByRole('link', { name: /view on blockscan/i })
        expect(link.getAttribute('href')).toBe(`https://blockscan.com/tx/${hash}`)
        expect(document.body.textContent).not.toContain('BscScan')
    })

    it('shows the token artwork and moving progress surface while a send is pending', () => {
        const { container } = render(
            <TransactionStatusDialog status="submitted" hash={hash} token={bnb} />,
        )
        const status = screen.getByRole('status')
        const tokenLogo = container.querySelector('.ps-token-main-logo')
        expect(screen.getByText('Waiting for confirmation')).toBeTruthy()
        expect(tokenLogo?.getAttribute('src')).toBe('/assets/bnb-logo-Ujb8xjX_.png')
        expect(status.style.position).toBe('relative')
        expect(status.style.overflow).toBe('hidden')
        expect(status.querySelector('span[aria-hidden="true"]')).toBeTruthy()
    })
})
