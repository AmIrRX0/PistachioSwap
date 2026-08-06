// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppFatalError from './AppFatalError.jsx'

describe('fatal error screen', () => {
    afterEach(cleanup)

    it('states the failure and offers recovery without leaking a cause', () => {
        const onReload = vi.fn()
        render(
            <AppFatalError
                title="PistachioSwap could not start"
                onReload={onReload}
            />,
        )

        const alert = screen.getByRole('alert')
        expect(alert.textContent).toContain('PistachioSwap could not start')
        expect(alert.textContent)
            .toContain('Your wallet has not been asked to sign or submit anything.')

        fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
        expect(onReload).toHaveBeenCalledTimes(1)
    })

    it('stays legible on the dark document background', () => {
        // The screen renders before the themed shell, so it cannot rely on the
        // shell's CSS variables and must carry readable literal colours.
        const css = readFileSync(resolve('src/index.css'), 'utf8')
        const block = /\.app-fatal-error\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
        expect(block).toMatch(/color:\s*#fff/)
        expect(block).not.toMatch(/color:\s*#151515/)
    })
})
