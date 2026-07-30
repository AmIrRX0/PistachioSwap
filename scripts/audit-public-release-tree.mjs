#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(new URL('..', import.meta.url).pathname)

const allowedEnvFiles = new Set([
    '.env.example',
    '.env.production.example',
    '.env.development.example',
    'apps/api/.env.example',
    'apps/api/.env.production.example',
    'apps/api/.env.unchained-uniswap.example',
])

const allowedPublicBoundaryPaths = [
    'apps/api/src/modules/gas-assist-proxy.ts',
    'apps/api/test/gas-assist-proxy.test.ts',
    'scripts/gas-assist-local/',
    'scripts/audit-private-gas-assist-boundary.mjs',
    'docs/private-gas-assist-boundary.md',
]

const prohibitedPathParts = [
    '.unchained/',
    'Pchained/',
    'Pchained-public/',
    'Gas-Assist/',
    '.gas-assist/',
    'gas-assist-private/',
    'node_modules/',
    'dist/',
    'coverage/',
]

const prohibitedFileParts = [
    '.pem',
    '.key',
    '.p12',
    '.pfx',
    'id_rsa',
    'id_ed25519',
]

const prohibitedPrivatePaths = [
    'apps/api/src/gas-assist/',
    'apps/api/src/modules/gas-assist.ts',
    'apps/api/src/modules/sponsorship.ts',
    'apps/api/src/modules/sponsorship-admin.ts',
    'apps/api/src/modules/sponsorship-refunds-admin.ts',
    'apps/api/src/providers/zero-x/gasless-client.ts',
]

const prohibitedIdentifiers = [
    'policy-management',
    'stored-intent-submitter',
    'manual-refund-ledger',
    'MEGAFUEL_FEE_POLICY_UUID',
    'MEGAFUEL_ACTION_POLICY_UUID',
    'MEGAFUEL_IP_HASH_SECRET',
    'GAS_ASSIST_NODEREAL_API_KEY',
    'GAS_ASSIST_PAYMASTER_POLICY_ID',
]

const identifierAllowlist = new Set([
    'scripts/audit-private-gas-assist-boundary.mjs',
    'scripts/audit-public-release-tree.mjs',
    'docs/private-gas-assist-boundary.md',
])

function git(args) {
    const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'buffer',
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status !== 0) {
        throw new Error((result.stderr.toString('utf8') || result.stdout.toString('utf8') || `git ${args.join(' ')} failed`).trim())
    }
    return result.stdout
}

function trackedFiles() {
    const output = git(['ls-files', '-z'])
    return output.toString('utf8').split('\0').filter(Boolean)
}

function isAllowedBoundaryPath(file) {
    return allowedPublicBoundaryPaths.some((allowed) => (
        allowed.endsWith('/') ? file.startsWith(allowed) : file === allowed
    ))
}

function isEnvPath(file) {
    const name = file.split('/').pop()
    return name === '.env' || name.startsWith('.env.')
}

function shouldReadContent(file) {
    if (isEnvPath(file) && !allowedEnvFiles.has(file)) return false
    if (prohibitedFileParts.some((part) => file.includes(part))) return false
    return true
}

const files = trackedFiles()
const violations = []

for (const file of files) {
    if (!isAllowedBoundaryPath(file)) {
        if (prohibitedPathParts.some((part) => file === part.replace(/\/$/, '') || file.includes(part))) {
            violations.push({ file, reason: 'prohibited tracked path' })
        }

        if (prohibitedPrivatePaths.some((path) => file === path.replace(/\/$/, '') || file.startsWith(path))) {
            violations.push({ file, reason: 'private backend implementation path' })
        }
    }

    if (isEnvPath(file) && !allowedEnvFiles.has(file)) {
        violations.push({ file, reason: 'tracked non-example environment file' })
    }

    if (prohibitedFileParts.some((part) => file.includes(part))) {
        violations.push({ file, reason: 'credential-like tracked filename' })
    }

    if (/^apps\/api\/drizzle\/.*(gas|sponsor)/i.test(file)) {
        violations.push({ file, reason: 'private gas/sponsor drizzle artifact' })
    }

    if (!identifierAllowlist.has(file) && shouldReadContent(file)) {
        const content = readFileSync(resolve(root, file), 'utf8')
        for (const identifier of prohibitedIdentifiers) {
            if (content.includes(identifier)) {
                violations.push({ file, reason: `prohibited identifier: ${identifier}` })
            }
        }
    }
}

if (violations.length > 0) {
    console.error('Public release tree audit failed. Violating tracked paths:')
    for (const violation of violations) {
        console.error(`- ${violation.file} (${violation.reason})`)
    }
    process.exit(1)
}

console.log(`Public release tree audit passed. Checked ${files.length} tracked files.`)
