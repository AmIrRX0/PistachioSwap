// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const state = {
        listener: null,
        snapshot: null,
    }
    const publish = (patch) => {
        state.snapshot = { ...state.snapshot, ...patch }
        state.listener?.(state.snapshot)
    }
    const manager = {
        initialize: vi.fn(async () => undefined),
        snapshot: vi.fn(() => state.snapshot),
        subscribe: vi.fn((listener) => {
            state.listener = listener
            return () => {
                if (state.listener === listener) state.listener = null
            }
        }),
        recordActivity: vi.fn(async () => undefined),
        close: vi.fn(),
        reviewQueue: {
            subscribe: vi.fn((listener) => {
                listener(null)
                return () => undefined
            }),
        },
    }
    return { manager, publish, state }
})

vi.mock('../services/walletManager.js', () => ({
    getPistachioWalletManager: () => mocks.manager,
}))

vi.mock('./PistachioWalletScreens.jsx', () => ({
    LoadingState: ({ title }) => <div data-testid="loading-state">{title}</div>,
    SetupContent: () => null,
    SavedWalletEntry: () => null,
    SavedWalletChooser: () => null,
    AnotherWalletMenu: () => null,
    RestoreBackupContent: () => null,
    UnlockedContent: () => <input aria-label="recovery-render-state" defaultValue="" />,
    SigningReviewDialog: () => null,
    StorageErrorContent: () => null,
    LockedSessionScreen: () => null,
    ExitConfirmation: () => null,
}))

import PistachioWalletController from './PistachioWalletController.jsx'

const vault = {
    address: '0x1111111111111111111111111111111111111111',
    keyWraps: [{ id: 'wrap-1' }],
    sourceType: 'generated-mnemonic',
    vaultId: 'vault-1',
}

function authorizedSnapshot(phase = 'unlocked') {
    return {
        address: phase === 'unlocked'
            ? '0x1111111111111111111111111111111111111111'
            : null,
        connectionPending: false,
        enabled: true,
        error: null,
        flags: {},
        lastUnlockByWrap: {},
        phase,
        recoveryBackupConfirmed: true,
        resumeReauthPending: phase !== 'unlocked',
        selectedVaultId: 'vault-1',
        sessionActive: true,
        signingPasskeyOnly: true,
        vault,
        vaults: [],
        view: 'wallet',
        walletViewAuthorized: true,
    }
}

describe('recovery reveal wallet screen persistence', () => {
    beforeEach(() => {
        mocks.state.listener = null
        mocks.state.snapshot = authorizedSnapshot('unlocked')
        mocks.manager.initialize.mockClear()
        mocks.manager.subscribe.mockClear()
    })

    it('keeps the wallet screen mounted while a fresh recovery passkey is being verified', () => {
        render(<PistachioWalletController />)
        const field = screen.getByRole('textbox', { name: 'recovery-render-state' })
        fireEvent.change(field, { target: { value: 'state-that-must-survive' } })

        act(() => mocks.publish({
            address: null,
            phase: 'unlocking',
            resumeReauthPending: true,
        }))

        expect(screen.getByRole('textbox', { name: 'recovery-render-state' }).value)
            .toBe('state-that-must-survive')
        expect(screen.queryByTestId('loading-state')).toBeNull()

        act(() => mocks.publish({
            address: null,
            phase: 'locked',
            resumeReauthPending: true,
        }))

        expect(screen.getByRole('textbox', { name: 'recovery-render-state' }).value)
            .toBe('state-that-must-survive')
    })
})
