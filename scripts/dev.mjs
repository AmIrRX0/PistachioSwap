import { spawn } from 'node:child_process'
import process from 'node:process'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const children = new Set()
let shuttingDown = false

function start(name, args) {
    const child = spawn(pnpm, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
    })

    children.add(child)

    child.once('error', (error) => {
        console.error(`[dev:${name}] failed to start:`, error)
        shutdown(1)
    })

    child.once('exit', (code, signal) => {
        children.delete(child)
        if (shuttingDown) return

        if (signal) {
            console.error(`[dev:${name}] stopped by ${signal}`)
        } else if (code !== 0) {
            console.error(`[dev:${name}] exited with code ${code}`)
        }

        shutdown(code ?? 1)
    })

    return child
}

function terminate(child, signal) {
    if (child.exitCode !== null || child.signalCode !== null) return
    child.kill(signal)
}

function shutdown(exitCode = 0) {
    if (shuttingDown) return
    shuttingDown = true

    for (const child of children) terminate(child, 'SIGTERM')

    const forceTimer = setTimeout(() => {
        for (const child of children) terminate(child, 'SIGKILL')
    }, 5_000)
    forceTimer.unref()

    const poll = setInterval(() => {
        if (children.size > 0) return
        clearInterval(poll)
        process.exit(exitCode)
    }, 50)
    poll.unref()
}

process.once('SIGINT', () => shutdown(130))
process.once('SIGTERM', () => shutdown(143))

console.log('Starting PistachioSwap frontend and public API...')
start('api', ['run', 'dev:api'])
start('web', ['run', 'dev:web'])
