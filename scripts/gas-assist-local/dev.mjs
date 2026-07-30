#!/usr/bin/env node
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const root = resolve(new URL('../..', import.meta.url).pathname)
const gasAssistDir = resolve(root, process.env.GAS_ASSIST_LOCAL_DIR || '../Gas-Assist')

console.log(`Starting private Gas Assist from ${gasAssistDir}`)
console.log('The private service is expected to listen on 127.0.0.1:3002.')
console.log('Secrets are read by that checkout from its own environment or .env file.')

const child = spawn('pnpm', ['dev'], {
    cwd: gasAssistDir,
    stdio: 'inherit',
    env: { ...process.env },
})

child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
})
