import { describe, expect, it } from 'vitest'

import { validateUniswapIntegratorFee } from '../src/features/quotes/providers/uniswap-provider.js'

const buyToken = '0x0000000000000000000000000000000000000002'
const treasury = '0x0000000000000000000000000000000000000003'

describe('Uniswap normal-swap fee denomination', () => {
    it('accepts the documented output-token integrator fee', () => {
        const result = validateUniswapIntegratorFee({
            rawQuote: {
                output: { amount: '10000' },
                aggregatedOutputs: [
                    { amount: '9933', token: buyToken },
                    {
                        fee: 'INTEGRATOR',
                        amount: '67',
                        token: buyToken,
                        recipient: treasury,
                        bps: 67,
                    },
                ],
            },
            buyToken,
            sellAmount: '10000',
            expected: { bps: 67, recipient: treasury },
        })

        expect(result.platformFee).toEqual({
            amount: '67',
            token: buyToken,
            bps: 67,
        })
    })

    it('rejects an integrator fee denominated in another token', () => {
        expect(() => validateUniswapIntegratorFee({
            rawQuote: {
                output: { amount: '10000' },
                aggregatedOutputs: [
                    { amount: '9933', token: buyToken },
                    {
                        fee: 'INTEGRATOR',
                        amount: '67',
                        token: '0x0000000000000000000000000000000000000001',
                        recipient: treasury,
                        bps: 67,
                    },
                ],
            },
            buyToken,
            sellAmount: '10000',
            expected: { bps: 67, recipient: treasury },
        })).toThrow()
    })
})
