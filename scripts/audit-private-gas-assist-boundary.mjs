#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(new URL('..', import.meta.url).pathname)
const reportPath = '/tmp/pistachioswap-private-ref-audit.md'

const prohibitedPaths = [
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
    'sponsorship_intents',
    'MEGAFUEL_FEE_POLICY_UUID',
    'MEGAFUEL_ACTION_POLICY_UUID',
    'MEGAFUEL_IP_HASH_SECRET',
    'GAS_ASSIST_NODEREAL_API_KEY',
    'GAS_ASSIST_PAYMASTER_POLICY_ID',
]
const allowedIdentifierFiles = new Set([
    'scripts/audit-private-gas-assist-boundary.mjs',
    'scripts/audit-public-release-tree.mjs',
    'docs/private-gas-assist-boundary.md',
])

function git(args, options = {}) {
    const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...options,
    })
    if (result.status !== 0 && !options.allowFailure) {
        throw new Error((result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim())
    }
    return result.stdout.trim()
}

function trackedFiles(ref = null) {
    const args = ref
        ? ['ls-tree', '-r', '--name-only', ref]
        : ['ls-files']
    return git(args, { allowFailure: true }).split('\n').filter(Boolean)
}

function grepRef(ref = null) {
    const args = [
        'grep',
        '-n',
        '-I',
        '-E',
        prohibitedIdentifiers.join('|'),
    ]
    if (ref) args.push(ref)
    args.push('--', ':!*.env', ':!*.env.*')

    const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status === 1) return []
    if (result.status !== 0) return [`<grep failed: ${(result.stderr || '').trim()}>`]
    return result.stdout.trim().split('\n').filter(Boolean)
}

function classifyRef(name) {
    if (name.startsWith('refs/remotes/')) return 'remote branches'
    if (name.startsWith('refs/tags/')) return 'tags'
    if (name.includes('/pull/') || name.includes('/pr/')) return 'pull-request refs'
    if (name.startsWith('refs/heads/')) return 'local-only branches'
    return 'unreachable or unknown objects that cannot be fully verified locally'
}

function refViolations(ref = null) {
    const files = trackedFiles(ref)
    const pathHits = files.filter((file) => (
        prohibitedPaths.some((path) => file === path.replace(/\/$/, '') || file.startsWith(path)) ||
        /^apps\/api\/drizzle\/.*(gas|sponsor|megafuel)/i.test(file)
    ))
    const identifierHits = grepRef(ref).filter((line) => {
        const file = ref
            ? line.replace(new RegExp(`^${ref}:`), '').split(':')[0]
            : line.split(':')[0]
        return !allowedIdentifierFiles.has(file)
    })
    return { pathHits, identifierHits }
}

const current = refViolations()
const currentClean = current.pathHits.length === 0 && current.identifierHits.length === 0
const refs = git(['for-each-ref', '--format=%(refname)']).split('\n').filter(Boolean)
const dirtyRefs = new Map()

for (const ref of refs) {
    const violations = refViolations(ref)
    if (violations.pathHits.length || violations.identifierHits.length) {
        const type = classifyRef(ref)
        const list = dirtyRefs.get(type) || []
        list.push({ ref, ...violations })
        dirtyRefs.set(type, list)
    }
}

const lines = [
    '# PistachioSwap Private Gas Assist Reference Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Clean Current Public Tree',
    '',
    currentClean ? 'The current worktree is clean for prohibited private Gas Assist implementation paths and identifiers.' : 'The current worktree still contains prohibited private Gas Assist boundary matches.',
    '',
]

if (!currentClean) {
    lines.push('### Current Path Hits', '', ...current.pathHits.map((hit) => `- ${hit}`), '')
    lines.push('### Current Identifier Hits', '', ...current.identifierHits.map((hit) => `- ${hit}`), '')
}

for (const type of [
    'dirty historical public refs',
    'local-only branches',
    'remote branches',
    'tags',
    'pull-request refs',
    'unreachable or unknown objects that cannot be fully verified locally',
]) {
    const entries = type === 'dirty historical public refs'
        ? [...dirtyRefs.values()].flat()
        : dirtyRefs.get(type) || []
    lines.push(`## ${type.replace(/^\w/, (char) => char.toUpperCase())}`, '')
    if (entries.length === 0) {
        lines.push('No matching refs were found locally.', '')
        continue
    }
    for (const entry of entries) {
        lines.push(`- ${entry.ref}`)
        for (const hit of entry.pathHits.slice(0, 20)) lines.push(`  - path: ${hit}`)
        for (const hit of entry.identifierHits.slice(0, 20)) lines.push(`  - identifier: ${hit}`)
        if (entry.pathHits.length + entry.identifierHits.length > 40) {
            lines.push('  - additional matches omitted from this summary')
        }
    }
    lines.push('')
}

writeFileSync(reportPath, `${lines.join('\n')}\n`)

if (!currentClean) {
    console.error(`Private Gas Assist boundary audit failed. See ${reportPath}`)
    process.exit(1)
}

console.log(`Private Gas Assist boundary audit passed. Report: ${reportPath}`)
