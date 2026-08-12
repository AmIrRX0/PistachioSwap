import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./metamaskMultichain.js', () => ({
    normalizePreparedSponsoredTransaction: (transaction) => transaction,
    validateSignedPreparedTransaction: vi.fn(async () => undefined),
}))

import { signPreparedSponsoredPackage } from './rawTransactionSigning.js'

const transactions = [
    'fee-payment-transfer',
    'token-approval',
    'normal-swap',
].map((action, index) => ({
    intentId: `intent-${index}`,
    action,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    transaction: {
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        data: '0x1234',
        value: '0x0',
        chainId: '0x38',
        nonce: `0x${index.toString(16)}`,
        gas: '0x5208',
        gasPrice: '0x0',
        type: '0x0',
    },
}))
const capability = {
    rawTransactionSigningSupported: true,
    method: 'eth_signTransaction',
    packageMethod: 'pistachio_signMegaFuelPackage',
    transport: 'pistachio-local',
}

function preparedPackage(overrides = {}) {
    return {
        orderId: 'order-1',
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        transactions,
        ...overrides,
    }
}

function packageSignatureResponse(pkg = preparedPackage()) {
    return {
        orderId: pkg.orderId,
        signedTransactions: pkg.transactions.map((item, index) => ({
            intentId: item.intentId,
            action: item.action,
            signedRawTransaction: `0x${String(index + 1).padStart(2, '0')}`,
        })),
    }
}

beforeEach(() => vi.restoreAllMocks())

describe('pre-signed Gas Assist package', () => {
    it('requests the wallet exactly once and submits all three validated signatures', async () => {
        const pkg = preparedPackage()
        const request = vi.fn(async () => packageSignatureResponse(pkg))
        const submitSignedPackage = vi.fn(async (values) => values)
        const result = await signPreparedSponsoredPackage({
            transport: 'pistachio-local',
            capability,
            walletClient: { request },
            preparedPackage: pkg,
            authenticatedWalletAddress: transactions[0].transaction.from,
            submitSignedPackage,
        })
        expect(request).toHaveBeenCalledTimes(1)
        expect(request).toHaveBeenCalledWith({
            method: 'pistachio_signMegaFuelPackage',
            params: [pkg],
        })
        expect(submitSignedPackage).toHaveBeenCalledTimes(1)
        expect(result.map((value) => value.action)).toEqual([
            'fee-payment-transfer',
            'token-approval',
            'normal-swap',
        ])
    })

    it('never submits a partial or mismatched package response', async () => {
        const pkg = preparedPackage()
        const request = vi.fn(async () => ({
            orderId: pkg.orderId,
            signedTransactions: packageSignatureResponse(pkg).signedTransactions.slice(0, 2),
        }))
        const submitSignedPackage = vi.fn()
        await expect(signPreparedSponsoredPackage({
            transport: 'pistachio-local',
            capability,
            walletClient: { request },
            preparedPackage: pkg,
            authenticatedWalletAddress: transactions[0].transaction.from,
            submitSignedPackage,
        })).rejects.toMatchObject({ code: 'SPONSORSHIP_PACKAGE_INVALID' })
        expect(request).toHaveBeenCalledTimes(1)
        expect(submitSignedPackage).not.toHaveBeenCalled()
    })

    it('rejects duplicate intent IDs before prompting the wallet', async () => {
        const request = vi.fn()
        const duplicate = transactions.map((item, index) => ({
            ...item,
            intentId: index === 2 ? transactions[1].intentId : item.intentId,
        }))

        await expect(signPreparedSponsoredPackage({
            transport: 'pistachio-local',
            capability,
            walletClient: { request },
            preparedPackage: preparedPackage({ transactions: duplicate }),
            authenticatedWalletAddress: transactions[0].transaction.from,
            submitSignedPackage: vi.fn(),
        })).rejects.toMatchObject({ code: 'SPONSORSHIP_PACKAGE_INVALID' })
        expect(request).not.toHaveBeenCalled()
    })

    it('rejects non-consecutive nonces before prompting the wallet', async () => {
        const request = vi.fn()
        const invalidNonces = transactions.map((item, index) => ({
            ...item,
            transaction: {
                ...item.transaction,
                nonce: index === 2 ? '0x5' : item.transaction.nonce,
            },
        }))

        await expect(signPreparedSponsoredPackage({
            transport: 'pistachio-local',
            capability,
            walletClient: { request },
            preparedPackage: preparedPackage({ transactions: invalidNonces }),
            authenticatedWalletAddress: transactions[0].transaction.from,
            submitSignedPackage: vi.fn(),
        })).rejects.toMatchObject({ code: 'SPONSORSHIP_PACKAGE_NONCE_MISMATCH' })
        expect(request).not.toHaveBeenCalled()
    })

    it('fails closed when the wallet lacks the one-confirmation package method', async () => {
        await expect(signPreparedSponsoredPackage({
            transport: 'pistachio-local',
            capability: { ...capability, packageMethod: null },
            walletClient: { request: vi.fn() },
            preparedPackage: preparedPackage(),
            authenticatedWalletAddress: transactions[0].transaction.from,
            submitSignedPackage: vi.fn(),
        })).rejects.toMatchObject({ code: 'PISTACHIO_BATCH_SIGNING_REQUIRED' })
    })
})
