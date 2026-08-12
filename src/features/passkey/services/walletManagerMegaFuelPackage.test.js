import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./transactionValidation.js', () => ({
    describeTransactionReview: (transaction) => ({
        to: transaction.to,
        nonce: transaction.nonce,
    }),
    validateLocallySignedTransaction: vi.fn(async () => undefined),
}))

vi.mock('../../gas-assist/services/metamaskMultichain.js', () => ({
    normalizePreparedSponsoredTransaction: (transaction) => ({ ...transaction }),
    validateSignedPreparedTransaction: vi.fn(async () => undefined),
}))

import { methods } from './walletManagerMegaFuelPackage.js'

const ADDRESS = '0x1111111111111111111111111111111111111111'

function preparedPackage(overrides = {}) {
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    return {
        orderId: 'order-1',
        expiresAt,
        transactions: [
            'fee-payment-transfer',
            'token-approval',
            'normal-swap',
        ].map((action, index) => ({
            action,
            intentId: `intent-${index}`,
            expiresAt,
            transaction: {
                from: ADDRESS,
                to: '0x2222222222222222222222222222222222222222',
                chainId: '0x38',
                nonce: `0x${index.toString(16)}`,
                gas: '0x5208',
                gasPrice: '0x0',
                type: '0x0',
                value: '0x0',
                data: '0x1234',
            },
        })),
        ...overrides,
    }
}

function fakeManager({ phase = 'unlocked' } = {}) {
    let signed = 0
    return {
        phase,
        address: ADDRESS,
        ensureUnlockedForSigning: vi.fn(async function ensure() {
            this.phase = 'unlocked'
        }),
        captureSigningContext: vi.fn(() => ({
            address: ADDRESS,
            chainId: 56,
            generation: 1,
        })),
        assertSigningContext: vi.fn(),
        reauthenticate: vi.fn(async () => true),
        recordActivity: vi.fn(async () => undefined),
        reviewQueue: { request: vi.fn(async () => undefined) },
        client: {
            request: vi.fn(async () => ({
                signedTransaction: `0x${String(++signed).padStart(2, '0')}`,
            })),
        },
    }
}

beforeEach(() => vi.restoreAllMocks())

describe('Pistachio Wallet MegaFuel package signing', () => {
    it('uses one review and one fresh passkey reauthentication for an unlocked wallet', async () => {
        const manager = fakeManager({ phase: 'unlocked' })
        const result = await methods.signMegaFuelPackage.call(manager, preparedPackage())

        expect(manager.reviewQueue.request).toHaveBeenCalledTimes(1)
        expect(manager.reauthenticate).toHaveBeenCalledTimes(1)
        expect(manager.client.request).toHaveBeenCalledTimes(3)
        expect(result.signedTransactions.map((item) => item.action)).toEqual([
            'fee-payment-transfer',
            'token-approval',
            'normal-swap',
        ])
    })

    it('does not perform a second passkey reauthentication after a resumed session unlock', async () => {
        const manager = fakeManager({ phase: 'locked' })
        await methods.signMegaFuelPackage.call(manager, preparedPackage())

        expect(manager.ensureUnlockedForSigning).toHaveBeenCalledTimes(1)
        expect(manager.reauthenticate).not.toHaveBeenCalled()
        expect(manager.reviewQueue.request).toHaveBeenCalledTimes(1)
    })

    it('rejects malformed package nonces before review or signing', async () => {
        const manager = fakeManager({ phase: 'unlocked' })
        const pkg = preparedPackage()
        pkg.transactions[2].transaction.nonce = '0x7'

        await expect(
            methods.signMegaFuelPackage.call(manager, pkg),
        ).rejects.toMatchObject({ code: 'SPONSORSHIP_PACKAGE_NONCE_MISMATCH' })
        expect(manager.reviewQueue.request).not.toHaveBeenCalled()
        expect(manager.reauthenticate).not.toHaveBeenCalled()
        expect(manager.client.request).not.toHaveBeenCalled()
    })

    it('aborts if the signing context changes after the one-time review', async () => {
        const manager = fakeManager({ phase: 'unlocked' })
        manager.assertSigningContext
            .mockImplementationOnce(() => undefined)
            .mockImplementationOnce(() => {
                const error = new Error('changed')
                error.code = 'PISTACHIO_SIGNING_CONTEXT_CHANGED'
                throw error
            })

        await expect(
            methods.signMegaFuelPackage.call(manager, preparedPackage()),
        ).rejects.toMatchObject({ code: 'PISTACHIO_SIGNING_CONTEXT_CHANGED' })
        expect(manager.client.request).not.toHaveBeenCalled()
    })
})
