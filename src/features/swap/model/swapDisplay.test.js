import { describe, expect, it } from 'vitest'

import {
    formatAmountInputDisplay,
    formatCompactAmountInput,
    formatSwapSecondaryTokenAmount,
} from './swapDisplay.js'

describe('formatCompactAmountInput', () => {
    it('trims trailing zeros without grouping commas', () => {
        expect(formatCompactAmountInput('2.074720000')).toBe('2.07472')
        expect(formatCompactAmountInput('10')).toBe('10')
        expect(formatCompactAmountInput('')).toBe('')
    })

    it('rounds long token amounts to six fraction digits', () => {
        expect(formatCompactAmountInput('0.001144182429488718')).toBe('0.001144')
        expect(formatCompactAmountInput('0.00529963167546908')).toBe('0.0053')
    })

    it('rounds USD amounts to two fraction digits', () => {
        expect(formatCompactAmountInput('0.6898962376', 2)).toBe('0.69')
        expect(formatAmountInputDisplay('0.6898962376', 'USD')).toBe('0.69')
        expect(formatAmountInputDisplay('0.00529963167546908', 'TOKEN')).toBe('0.0053')
    })
})

describe('formatSwapSecondaryTokenAmount', () => {
    it('shortens the amount and keeps a safe symbol', () => {
        expect(formatSwapSecondaryTokenAmount('0.001144182429488718', {
            address: '0x0000000000000000000000000000000000000000',
            isNative: true,
            symbol: 'BNB',
        })).toBe('0.001144 BNB')
    })
})
