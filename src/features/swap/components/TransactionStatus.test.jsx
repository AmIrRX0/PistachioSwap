// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import TransactionStatus from './TransactionStatus.jsx'

describe('TransactionStatus', () => {
    it('shows an assisted-route message even when the wallet has some BNB but not enough for normal gas', () => {
        render(<TransactionStatus
            nativeBalanceError={false}
            nativeSymbol="BNB"
            executionMessage="Gas Assist will be used because the wallet does not have enough BNB for normal gas."
            showExecutionMessage={false}
            statusMessage={null}
        />)

        expect(screen.getByText(/Gas Assist will be used because the wallet does not have enough BNB/)).toBeTruthy()
    })
})
