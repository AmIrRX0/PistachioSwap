import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
const outputDir = resolve(rootDir, '.license-audit')
const policyPath = resolve(rootDir, 'config/third-party-license-policy.json')

mkdirSync(outputDir, { recursive: true })

const result = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['licenses', 'list', '--prod', '--long'],
    {
        cwd: rootDir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    },
)

if (result.error) {
    console.error(`Unable to run pnpm license inventory: ${result.error.message}`)
    process.exit(1)
}

if (result.status !== 0) {
    process.stderr.write(result.stderr || '')
    process.exit(result.status || 1)
}

const report = result.stdout
writeFileSync(resolve(outputDir, 'production.txt'), report)

const policy = JSON.parse(readFileSync(policyPath, 'utf8'))

function wildcardMatches(pattern, value) {
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replaceAll('*', '.*')
    return new RegExp(`^${escaped}$`, 'i').test(value)
}

function containsPattern(patterns, value) {
    return patterns.some((pattern) =>
        value.toLowerCase().includes(pattern.toLowerCase()),
    )
}

function parseRows(text) {
    const entries = []
    const seen = new Set()

    for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith('│')) continue
        const cells = line
            .split('│')
            .slice(1, -1)
            .map((cell) => cell.trim())

        if (cells.length < 2) continue
        const [rawName, rawLicense] = cells
        if (!rawName || !rawLicense || rawName === 'Package') continue

        const name = rawName.replace(/\s+\(dev\)$/i, '')
        const key = `${name}\u0000${rawLicense}`
        if (seen.has(key)) continue
        seen.add(key)
        entries.push({ name, license: rawLicense })
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name))
}

function findRule(rules, packageName) {
    return rules.find((rule) => wildcardMatches(rule.pattern, packageName))
}

const entries = parseRows(report)
if (entries.length === 0) {
    writeFileSync(
        resolve(outputDir, 'review-required.md'),
        '# Third-party license audit\n\nThe pnpm report was generated, but the audit parser recognized zero package rows. Treat this as a blocking parser failure.\n',
    )
    console.error('Third-party license audit parser recognized zero packages.')
    process.exit(1)
}

const allowed = []
const conditional = []
const blocking = []

for (const entry of entries) {
    const blockedPackage = findRule(policy.blockedPackages, entry.name)
    if (blockedPackage) {
        blocking.push({
            ...entry,
            reason: blockedPackage.reason,
        })
        continue
    }

    const unresolvedPackage = findRule(policy.unresolvedPackages, entry.name)
    if (unresolvedPackage && /unknown|see license|unlicensed/i.test(entry.license)) {
        blocking.push({
            ...entry,
            reason: unresolvedPackage.reason,
        })
        continue
    }

    const reviewed = findRule(policy.reviewedPackages, entry.name)
    if (reviewed) {
        const accepted = containsPattern(
            reviewed.acceptedLicensePatterns,
            entry.license,
        )
        if (!accepted) {
            blocking.push({
                ...entry,
                reason: `The detected license does not match the reviewed policy for ${reviewed.pattern}.`,
            })
            continue
        }

        conditional.push({
            ...entry,
            classification: reviewed.classification,
            conditions: reviewed.conditions,
            reviewedOn: reviewed.reviewedOn,
        })
        continue
    }

    if (containsPattern(policy.blockedLicensePatterns, entry.license)) {
        blocking.push({
            ...entry,
            reason: `License ${entry.license} is blocked by repository policy.`,
        })
        continue
    }

    if (/unknown|see license|unlicensed|custom/i.test(entry.license)) {
        blocking.push({
            ...entry,
            reason: 'The package license is unresolved and has no reviewed policy entry.',
        })
        continue
    }

    if (containsPattern(policy.allowedLicensePatterns, entry.license)) {
        allowed.push(entry)
        continue
    }

    blocking.push({
        ...entry,
        reason: `License ${entry.license} is not classified by repository policy.`,
    })
}

const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
        packages: entries.length,
        allowed: allowed.length,
        conditional: conditional.length,
        blocking: blocking.length,
    },
    allowed,
    conditional,
    blocking,
}

writeFileSync(
    resolve(outputDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
)

const reviewLines = [
    '# Third-party license audit',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- Packages: ${summary.totals.packages}`,
    `- Permissive: ${summary.totals.allowed}`,
    `- Conditional/custom review: ${summary.totals.conditional}`,
    `- Blocking: ${summary.totals.blocking}`,
    '',
    '## Conditional or custom-licensed packages',
    '',
]

if (conditional.length === 0) {
    reviewLines.push('None.', '')
} else {
    for (const item of conditional) {
        reviewLines.push(
            `- \`${item.name}\` — ${item.license} (${item.classification})`,
            `  - ${item.conditions}`,
        )
    }
    reviewLines.push('')
}

reviewLines.push('## Blocking packages', '')
if (blocking.length === 0) {
    reviewLines.push('None.', '')
} else {
    for (const item of blocking) {
        reviewLines.push(
            `- \`${item.name}\` — ${item.license}`,
            `  - ${item.reason}`,
        )
    }
    reviewLines.push('')
}

writeFileSync(
    resolve(outputDir, 'review-required.md'),
    `${reviewLines.join('\n')}\n`,
)

console.log(
    `License audit: ${allowed.length} permissive, ${conditional.length} conditional/custom, ${blocking.length} blocking.`,
)
console.log(`Reports written to ${outputDir}`)

if (blocking.length > 0) {
    console.error('Third-party license audit failed. Resolve every blocking package before release.')
    process.exit(1)
}
