import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
const pnpmStoreDir = resolve(rootDir, 'node_modules/.pnpm')
const policyPath = resolve(rootDir, 'config/third-party-license-policy.json')
const summaryPath = resolve(rootDir, '.license-audit/summary.json')
const outputDir = resolve(rootDir, '.license-audit/evidence')
const licenseNamePattern = /^(?:license|copying|notice)(?:\..+)?$/i

if (!existsSync(pnpmStoreDir)) {
    throw new Error('node_modules/.pnpm is missing. Run pnpm install first.')
}

const policy = JSON.parse(readFileSync(policyPath, 'utf8'))
const auditSummary = existsSync(summaryPath)
    ? JSON.parse(readFileSync(summaryPath, 'utf8'))
    : { blocking: [] }
const targetPatterns = [...new Set([
    ...policy.blockedPackages.map((entry) => entry.pattern),
    ...policy.unresolvedPackages.map((entry) => entry.pattern),
    ...auditSummary.blocking.map((entry) => entry.name),
])]

function wildcardMatches(pattern, value) {
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replaceAll('*', '.*')
    return new RegExp(`^${escaped}$`, 'i').test(value)
}

function isTargetPackage(name) {
    return targetPatterns.some((pattern) => wildcardMatches(pattern, name))
}

function listPackageDirectories(nodeModulesDir) {
    const directories = []
    if (!existsSync(nodeModulesDir)) return directories

    for (const entry of readdirSync(nodeModulesDir)) {
        const entryPath = join(nodeModulesDir, entry)
        if (!statSync(entryPath).isDirectory()) continue

        if (entry.startsWith('@')) {
            for (const scopedEntry of readdirSync(entryPath)) {
                const scopedPath = join(entryPath, scopedEntry)
                if (statSync(scopedPath).isDirectory()) directories.push(scopedPath)
            }
            continue
        }

        directories.push(entryPath)
    }

    return directories
}

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const evidence = []
const seen = new Set()

for (const storeEntry of readdirSync(pnpmStoreDir)) {
    const nodeModulesDir = join(pnpmStoreDir, storeEntry, 'node_modules')

    for (const packageDir of listPackageDirectories(nodeModulesDir)) {
        const packageJsonPath = join(packageDir, 'package.json')
        if (!existsSync(packageJsonPath)) continue

        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
        const name = String(packageJson.name || '')
        const version = String(packageJson.version || 'unknown')
        if (!name || !isTargetPackage(name)) continue

        const packageKey = `${name}@${version}`
        if (seen.has(packageKey)) continue
        seen.add(packageKey)

        const safeName = packageKey
            .replace(/^@/, '')
            .replaceAll('/', '__')
            .replaceAll(/[^a-zA-Z0-9_.@-]/g, '_')
        const packageOutputDir = join(outputDir, safeName)
        mkdirSync(packageOutputDir, { recursive: true })

        copyFileSync(packageJsonPath, join(packageOutputDir, 'package.json'))

        const licenseFiles = readdirSync(packageDir)
            .filter((fileName) => licenseNamePattern.test(fileName))
            .sort()

        for (const fileName of licenseFiles) {
            copyFileSync(
                join(packageDir, fileName),
                join(packageOutputDir, fileName),
            )
        }

        evidence.push({
            name,
            version,
            declaredLicense: packageJson.license ?? null,
            repository: packageJson.repository ?? null,
            licenseFiles,
            outputDirectory: safeName,
        })
    }
}

writeFileSync(
    join(outputDir, 'index.json'),
    `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        targetPatterns,
        packages: evidence,
    }, null, 2)}\n`,
)

console.log(`Collected license evidence for ${evidence.length} packages in ${outputDir}`)
