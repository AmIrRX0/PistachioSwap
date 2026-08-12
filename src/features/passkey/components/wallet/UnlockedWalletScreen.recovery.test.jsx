// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    revealRecoveryPhrase: vi.fn(),
}))

vi.mock('../../services/walletUIOperations.js', () => ({
    walletUIOperations: {
        addBackupPasskey: vi.fn(),
        confirmRecoveryBackup: vi.fn(),
        exportEncryptedBackup: vi.fn(),
        lock: vi.fn(),
        reauthenticate: vi.fn(),
        removePasskey: vi.fn(),
        renamePasskey: vi.fn(),
        revealRecoveryPhrase: mocks.revealRecoveryPhrase,
    },
}))

import { UnlockedContent } from './UnlockedWalletScreen.jsx'

const phrase = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima'

function snapshot() {
    return {
        address: '0x1111111111111111111111111111111111111111',
        lastUnlockByWrap: {},
        phase: 'unlocked',
        recoveryBackupConfirmed: true,
        vault: {
            address: '0x1111111111111111111111111111111111111111',
            keyWraps: [{
                createdAt: '2026-08-10T00:00:00.000Z',
                credentialTransports: [],
                id: 'wrap-1',
                label: 'Primary passkey',
                rpId: 'pistachioswap.com',
            }],
            sourceType: 'generated-mnemonic',
        },
    }
}

describe('recovery phrase reveal UI', () => {
    beforeEach(() => {
        mocks.revealRecoveryPhrase.mockReset()
        mocks.revealRecoveryPhrase.mockResolvedValue(phrase)
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
        })
    })

    it('shows all twelve words numbered 1 through 12 and copies them as one phrase', async () => {
        render(<UnlockedContent onSensitiveChange={vi.fn()} snapshot={snapshot()} />)

        fireEvent.click(screen.getByRole('button', { name: 'Reveal recovery phrase' }))

        const region = await screen.findByRole('region', { name: 'Recovery phrase' })
        const words = within(region).getAllByRole('listitem')

        expect(words).toHaveLength(12)
        expect(words[0]?.textContent).toContain('1.')
        expect(words[0]?.textContent).toContain('alpha')
        expect(words[11]?.textContent).toContain('12.')
        expect(words[11]?.textContent).toContain('lima')

        fireEvent.click(within(region).getByRole('button', { name: 'Copy recovery phrase' }))
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(phrase)
        await within(region).findByRole('button', { name: 'Copied' })
    })
})
