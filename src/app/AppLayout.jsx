const legalFooterStyle = {
    padding: '2rem 1rem 1.25rem',
    color: 'var(--color-text-secondary, currentColor)',
    fontSize: '0.75rem',
    opacity: 0.72,
    textAlign: 'center',
}

const legalLinkStyle = {
    color: 'inherit',
    textDecoration: 'none',
}

const showLegalFooter = import.meta.env.PROD

/**
 * Provides the existing top-level application shell and CSS-variable boundary.
 * @param {{style: object, header: import('react').ReactNode, children: import('react').ReactNode, overlays: import('react').ReactNode}} props Layout slots.
 * @returns {import('react').ReactElement} Main application landmark.
 * @sideEffects None; child slots own their interactions.
 */
export default function AppLayout({ style, header, children, overlays }) {
    return (
        <main className="app-shell" style={style}>
            {header}
            {children}
            {showLegalFooter && (
                <footer style={legalFooterStyle}>
                    <a href="/legal/third-party/" style={legalLinkStyle}>
                        Legal &amp; third-party notices
                    </a>
                </footer>
            )}
            {overlays}
        </main>
    )
}
