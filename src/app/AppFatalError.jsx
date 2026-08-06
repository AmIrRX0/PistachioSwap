/**
 * Renders the user-safe fatal-error screen shared by the error boundary and the bootstrap.
 * @param {{title?: string, onReload?: () => void}} props Optional headline and reload handler.
 * @returns {import('react').ReactElement} Alert region with a reload control.
 * @sideEffects Reloads the document when no `onReload` handler is supplied.
 */
export default function AppFatalError({
    title = 'PistachioSwap could not load',
    onReload,
}) {
    return (
        <main className="app-fatal-error" role="alert">
            <h1>{title}</h1>
            <p>Your wallet has not been asked to sign or submit anything.</p>
            <button
                type="button"
                onClick={onReload ?? (() => window.location.reload())}
            >
                Reload
            </button>
        </main>
    )
}
