import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const state = {
        snapshot: null,
    }
    const client = {
        request: vi.fn(),
    }
    const manager = {
        address: '0x1111111111111111111111111111111111111111',
        client,
        phase: 'unlocked',
        reauthenticate: vi.fn(async function reauthenticate() {
            state.snapshot = {
                ...state.snapshot,
                lastUnlockByWrap: {
                    ...state.snapshot.lastUnlockByWrap,
                    'wrap-1': new Date(Date.now()).toISOString(),
                },
            }
            return true
        }),
        recordActivity: vi.fn(async () => undefined),
        requireUnlocked: vi.fn(function requireUnlocked() {
            if (this.phase !== 'unlocked' || !this.address || !this.client) {
                throw new Error('locked')
            }
        }),
        snapshot: vi.fn(() => state.snapshot),
    }
    return { client, manager, state }
})

vi.mock('./walletManager.js', () => ({
    getPistachioWalletManager: () => mocks.manager,
}))

import {
    walletUIOperationInternals,
    walletUIOperations,
} from './walletUIOperations.js'

const vault = {
    vaultId: 'vault-1',
    keyWraps: [{ id: 'wrap-1' }],
}

function snapshotAt(verifiedAt) {
    return {
        lastUnlockByWrap: {
            'wrap-1': new Date(verifiedAt).toISOString(),
        },
        vault,
    }
}

describe('recovery reveal passkey grace', () => {
    beforeEach(() => {
        vi.useRealTimers()
        mocks.manager.phase = 'unlocked'
        mocks.manager.address = '0x1111111111111111111111111111111111111111'
        mocks.manager.client = mocks.client
        mocks.client.request.mockReset()
        mocks.manager.reauthenticate.mockClear()
        mocks.manager.recordActivity.mockClear()
        mocks.manager.requireUnlocked.mockClear()
    })

    it('reuses a wallet passkey verification for recovery phrase reveal for five minutes', async () => {
        const now = Date.now()
        mocks.state.snapshot = snapshotAt(now - 60_000)
        mocks.client.request.mockResolvedValue({
            recoveryPhrase: 'test recovery phrase',
        })

        await expect(walletUIOperations.revealRecoveryPhrase())
            .resolves.toBe('test recovery phrase')

        expect(mocks.manager.reauthenticate).not.toHaveBeenCalled()
        expect(mocks.client.request).toHaveBeenCalledWith('revealRecoveryPhrase')
        expect(mocks.manager.recordActivity).toHaveBeenCalledOnce()
    })

    it('requires a fresh passkey after the five-minute reveal window expires', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-10T07:00:00.000Z'))
        const now = Date.now()
        mocks.state.snapshot = snapshotAt(
            now - walletUIOperationInternals.RECOVERY_REVEAL_AUTH_GRACE_MS - 1,
        )
        mocks.client.request.mockResolvedValue({
            recoveryPhrase: 'freshly verified phrase',
        })

        await expect(walletUIOperations.revealRecoveryPhrase())
            .resolves.toBe('freshly verified phrase')

        expect(mocks.manager.reauthenticate).toHaveBeenCalledOnce()
        expect(mocks.manager.requireUnlocked).toHaveBeenCalledOnce()
        expect(mocks.client.request).toHaveBeenCalledWith('revealRecoveryPhrase')
        vi.useRealTimers()
    })

    it('does not reuse a recent timestamp if decrypted worker state is unavailable', async () => {
        const now = Date.now()
        mocks.state.snapshot = snapshotAt(now - 30_000)
        mocks.manager.phase = 'locked'
        mocks.manager.address = null
        mocks.manager.client = null
        mocks.manager.reauthenticate.mockImplementationOnce(async function reauthenticate() {
            this.phase = 'unlocked'
            this.address = '0x1111111111111111111111111111111111111111'
            this.client = mocks.client
            return true
        })
        mocks.client.request.mockResolvedValue({ privateKey: '0x' + '11'.repeat(32) })

        await expect(walletUIOperations.revealPrivateKey())
            .resolves.toMatch(/^0x11/u)

        expect(mocks.manager.reauthenticate).toHaveBeenCalledOnce()
        expect(mocks.client.request).toHaveBeenCalledWith('revealPrivateKey')
    })
})
