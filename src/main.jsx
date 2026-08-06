import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import AppErrorBoundary from './app/AppErrorBoundary.jsx'
import AppFatalError from './app/AppFatalError.jsx'
import './index.css'

const root = createRoot(document.getElementById('root'))

/*
 * AppKit validates its configuration while its module is evaluated, so a bad
 * or missing project ID throws before React can mount. Importing it lazily
 * keeps that failure inside a catch and shows the fatal-error screen instead
 * of leaving a blank document.
 */
Promise.all([
    import('./App.jsx'),
    import('./web3/AppKitProvider.jsx'),
]).then(([{ default: App }, { default: AppKitProvider }]) => {
    root.render(
        <StrictMode>
            <AppErrorBoundary>
                <AppKitProvider>
                    <App />
                </AppKitProvider>
            </AppErrorBoundary>
        </StrictMode>,
    )
}).catch((error) => {
    if (import.meta.env.DEV) {
        console.error('[app-bootstrap]', error)
    }
    root.render(
        <StrictMode>
            <AppFatalError title="PistachioSwap could not start" />
        </StrictMode>,
    )
})
