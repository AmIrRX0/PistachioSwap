#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(new URL('../..', import.meta.url).pathname)
const gasAssistDir = resolve(root, process.env.GAS_ASSIST_LOCAL_DIR || '../Gas-Assist')

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status !== 0) {
        throw new Error((result.stderr || result.stdout || `${command} failed`).trim())
    }
    return result.stdout.trim()
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

assert(existsSync(gasAssistDir), `Gas Assist checkout not found: ${gasAssistDir}`)
assert(statSync(gasAssistDir).isDirectory(), `Gas Assist path is not a directory: ${gasAssistDir}`)
assert(existsSync(resolve(gasAssistDir, '.git')), 'Gas Assist checkout is not a Git repository.')

const topLevel = run('git', ['rev-parse', '--show-toplevel'], gasAssistDir)
assert(topLevel === gasAssistDir, `Unexpected Gas Assist repository root: ${topLevel}`)

const origin = run('git', ['remote', 'get-url', 'origin'], gasAssistDir)
assert(
    origin === 'https://github.com/parsij/Gas-Assist.git' ||
    origin === 'git@github.com:parsij/Gas-Assist.git',
    `Unexpected Gas Assist origin: ${origin}`,
)

for (const file of ['package.json', 'pnpm-lock.yaml', 'src/app.ts', 'src/server.ts']) {
    assert(existsSync(resolve(gasAssistDir, file)), `Required Gas Assist file is missing: ${file}`)
}

const prohibitedPublicPaths = [
    'apps/api/src/gas-assist',
    'apps/api/src/modules/gas-assist.ts',
    'apps/api/src/modules/sponsorship.ts',
    'apps/api/src/modules/sponsorship-admin.ts',
    'apps/api/src/modules/sponsorship-refunds-admin.ts',
    'apps/api/src/providers/zero-x/gasless-client.ts',
]
const copied = prohibitedPublicPaths.filter((path) => existsSync(resolve(root, path)))
assert(copied.length === 0, `Private Gas Assist source remains in public tree: ${copied.join(', ')}`)

console.log(`Gas Assist checkout OK: ${gasAssistDir}`)
console.log('Private service should listen on 127.0.0.1:3002.')
