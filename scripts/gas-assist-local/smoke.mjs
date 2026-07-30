#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const gasAssistDir = resolve(root, process.env.GAS_ASSIST_LOCAL_DIR || '../Gas-Assist')
const token = process.env.GAS_ASSIST_INTERNAL_TOKEN || 'local-smoke-internal-token-32-characters'
const publicPort = Number(process.env.GAS_ASSIST_SMOKE_PUBLIC_PORT || 4301)
const privatePort = Number(process.env.GAS_ASSIST_SMOKE_PRIVATE_PORT || 3002)
const privateBase = `http://127.0.0.1:${privatePort}`
const publicBase = `http://127.0.0.1:${publicPort}`
const children = []

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env })
    if (result.status !== 0) process.exit(result.status ?? 1)
}

function start(command, args, cwd, env) {
    const child = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
    })
    children.push(child)
    child.stdout.on('data', (chunk) => process.stdout.write(chunk))
    child.stderr.on('data', (chunk) => process.stderr.write(chunk))
    return child
}

function stopChildren() {
    for (const child of children) {
        if (!child.killed) child.kill('SIGTERM')
    }
}

async function waitFor(url, headers = {}) {
    const deadline = Date.now() + 20_000
    let lastError
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { headers })
            if (response.status < 500) return response
            lastError = new Error(`HTTP ${response.status}`)
        } catch (error) {
            lastError = error
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 500))
    }
    throw lastError || new Error(`Timed out waiting for ${url}`)
}

async function expectStatus(label, url, expected, headers = {}) {
    const response = await fetch(url, { headers })
    if (response.status !== expected) {
        throw new Error(`${label} expected HTTP ${expected}, got ${response.status}`)
    }
}

async function main() {
    run('node', ['scripts/gas-assist-local/config-check.mjs'], root)

    start('pnpm', ['exec', 'tsx', 'src/server.ts'], gasAssistDir, {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(privatePort),
        GAS_ASSIST_INTERNAL_TOKEN: token,
        GAS_ASSIST_MODE: 'disabled',
        MEGAFUEL_PREPAID_ENABLED: 'false',
    })
    await waitFor(`${privateBase}/health`)

    await expectStatus('missing internal token', `${privateBase}/v1/gas-assist/config`, 401)
    await expectStatus('incorrect internal token', `${privateBase}/v1/gas-assist/config`, 401, {
        'x-pistachio-internal-token': `${token}-wrong`,
    })
    await expectStatus('correct internal token', `${privateBase}/v1/gas-assist/config`, 200, {
        'x-pistachio-internal-token': token,
    })

    start('pnpm', ['--filter', '@pistachio/api', 'exec', 'tsx', 'src/server.ts'], root, {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(publicPort),
        GAS_ASSIST_SERVICE_ENABLED: 'true',
        GAS_ASSIST_SERVICE_URL: privateBase,
        GAS_ASSIST_INTERNAL_TOKEN: token,
        GAS_ASSIST_SERVICE_TIMEOUT_MS: '30000',
        GAS_ASSIST_SERVICE_MAX_RESPONSE_BYTES: '2097152',
    })
    await waitFor(`${publicBase}/health`)
    await expectStatus('browser-facing public route', `${publicBase}/api/v1/gas-assist/config`, 200)

    console.log('Gas Assist smoke checks passed.')
}

process.on('exit', stopChildren)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

try {
    await main()
} catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
} finally {
    stopChildren()
}
