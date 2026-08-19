// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SwapAmountInput from './SwapAmountInput.jsx'

describe('SwapAmountInput', () => {
    it('shows a rounded amount while idle and the exact value while focused', () => {
        const exact = '0.00529963167546908'
        render(
            <SwapAmountInput
                value={exact}
                denomination="TOKEN"
                label="Sell"
                className="sell-amount-input"
                onChange={() => {}}
            />,
        )
        const input = screen.getByRole('textbox', { name: 'Sell amount' })
        expect(input.value).toBe('0.0053')

        fireEvent.focus(input)
        expect(input.value).toBe(exact)
        fireEvent.blur(input)
        expect(input.value).toBe('0.0053')
    })

    it('rounds idle USD amounts to cents', () => {
        render(
            <SwapAmountInput
                value="0.6898962376"
                denomination="USD"
                label="Sell"
                className="sell-amount-input"
                onChange={() => {}}
            />,
        )
        expect(screen.getByRole('textbox', { name: 'Sell USD amount' }).value).toBe('0.69')
    })
})
