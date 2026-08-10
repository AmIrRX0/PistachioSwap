import { getPistachioWalletManager } from './walletManager.js'

const RECOVERY_REVEAL_AUTH_GRACE_MS = 5 * 60_000
const manager = getPistachioWalletManager()

function latestVerificationAt(snapshot) {
    const wraps = snapshot?.vault?.keyWraps ?? []
    const lastUnlockByWrap = snapshot?.lastUnlockByWrap ?? {}
    let latest = 0
    for (const wrap of wraps) {
        const timestamp = Date.parse(lastUnlockByWrap[wrap.id] ?? '')
        if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp)
    }
    return latest
}

function hasRecentRecoveryRevealAuthorization(
    snapshot = manager.snapshot(),
    now = Date.now(),
) {
    const verifiedAt = latestVerificationAt(snapshot)
    return verifiedAt > 0 && now >= verifiedAt &&
        now - verifiedAt < RECOVERY_REVEAL_AUTH_GRACE_MS
}

async function ensureRecoveryRevealAuthorization() {
    const snapshot = manager.snapshot()
    const workerReady = manager.phase === 'unlocked' &&
        Boolean(manager.address) &&
        Boolean(manager.client)

    if (workerReady && hasRecentRecoveryRevealAuthorization(snapshot)) return

    // Reauthentication is intentionally performed directly instead of calling
    // manager.revealRecoveryPhrase()/revealPrivateKey(). The production wrapper
    // wipes the worker immediately after those methods, which would defeat the
    // requested five-minute passkey grace window.
    await manager.reauthenticate()
    manager.requireUnlocked()
}

async function revealWorkerSecret(method, field) {
    await ensureRecoveryRevealAuthorization()
    const result = await manager.client.request(method)
    const secret = result?.[field]
    if (typeof secret !== 'string' || !secret) {
        const error = new Error('Pistachio Wallet did not return the requested recovery secret.')
        error.code = 'PISTACHIO_RECOVERY_SECRET_UNAVAILABLE'
        throw error
    }
    await manager.recordActivity?.()
    return secret
}

const overrides = Object.freeze({
    revealRecoveryPhrase: () => revealWorkerSecret(
        'revealRecoveryPhrase',
        'recoveryPhrase',
    ),
    revealPrivateKey: () => revealWorkerSecret(
        'revealPrivateKey',
        'privateKey',
    ),
})

/**
 * Provides the wallet manager to wallet UI screens. Recovery-secret reveals use
 * a successful passkey verification for five minutes; signing and other wallet
 * security operations retain their existing authentication rules.
 */
export const walletUIOperations = new Proxy(manager, {
    get(target, property) {
        if (property in overrides) return overrides[property]
        const value = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
    },
})

export const walletUIOperationInternals = {
    RECOVERY_REVEAL_AUTH_GRACE_MS,
    hasRecentRecoveryRevealAuthorization,
    latestVerificationAt,
}
