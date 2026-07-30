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
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
const pnpmStoreDir = resolve(rootDir, 'node_modules/.pnpm')
const outputDir = resolve(rootDir, 'public/legal/third-party')
const scopes = ['@reown', '@walletconnect', '@metamask']
const exactPackages = ['eyes', 'text-encoding-utf-8']
const licenseNamePattern = /^(?:license|copying|notice)(?:\..+)?$/i

if (!existsSync(pnpmStoreDir)) {
    throw new Error('node_modules/.pnpm is missing. Run pnpm install first.')
}

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const copied = []
const packagesWithoutLocalLicense = []
const installedGroups = new Set()
const licensedGroups = new Set()
const seen = new Set()

function copyPackageLicenseFiles(packageDir, group, fallbackName) {
    const packageJsonPath = join(packageDir, 'package.json')
    if (!existsSync(packageJsonPath)) return

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const name = String(packageJson.name || fallbackName)
    const version = String(packageJson.version || 'unknown')
    const packageKey = `${name}@${version}`
    if (seen.has(packageKey)) return
    seen.add(packageKey)
    installedGroups.add(group)

    const licenseFiles = readdirSync(packageDir)
        .filter((fileName) => licenseNamePattern.test(fileName))
        .sort()

    if (licenseFiles.length === 0) {
        packagesWithoutLocalLicense.push(packageKey)
        return
    }

    licensedGroups.add(group)

    for (const fileName of licenseFiles) {
        const safeName = name
            .replace(/^@/, '')
            .replaceAll('/', '__')
            .replaceAll(/[^a-zA-Z0-9_.-]/g, '_')
        const destinationName = `${safeName}__${version}__${basename(fileName)}`
        copyFileSync(
            join(packageDir, fileName),
            join(outputDir, destinationName),
        )
        copied.push({
            package: name,
            version,
            sourceFile: fileName,
            outputFile: destinationName,
        })
    }
}

for (const storeEntry of readdirSync(pnpmStoreDir)) {
    const nodeModulesDir = join(pnpmStoreDir, storeEntry, 'node_modules')
    if (!existsSync(nodeModulesDir)) continue

    for (const scope of scopes) {
        const scopeDir = join(nodeModulesDir, scope)
        if (!existsSync(scopeDir) || !statSync(scopeDir).isDirectory()) continue

        for (const packageFolder of readdirSync(scopeDir)) {
            const packageDir = join(scopeDir, packageFolder)
            if (!statSync(packageDir).isDirectory()) continue
            copyPackageLicenseFiles(
                packageDir,
                scope,
                `${scope}/${packageFolder}`,
            )
        }
    }

    for (const packageName of exactPackages) {
        const packageDir = join(nodeModulesDir, packageName)
        if (!existsSync(packageDir) || !statSync(packageDir).isDirectory()) continue
        copyPackageLicenseFiles(packageDir, packageName, packageName)
    }
}

if (copied.length === 0) {
    throw new Error('No targeted third-party license files were discovered.')
}

for (const group of installedGroups) {
    if (!licensedGroups.has(group)) {
        throw new Error(`No license file was discovered for installed ${group} packages.`)
    }
}

const notice = [
    'PistachioSwap third-party notices',
    '',
    'Portions © 2025 Reown, Inc. All Rights Reserved.',
    'PistachioSwap uses MetaMask Connect components.',
    'Copyright ConsenSys Software Inc. 2022. All rights reserved.',
    '',
    'The files in this directory are copied from the exact installed package',
    'versions during the build. Those files remain governed by their own terms',
    'and are not relicensed under PistachioSwap\'s PolyForm Noncommercial License.',
    '',
].join('\n')

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

const licenseLinks = copied
    .map((item) => [
        '<li>',
        `<a href="${encodeURIComponent(item.outputFile)}">`,
        `${escapeHtml(item.package)}@${escapeHtml(item.version)} — ${escapeHtml(item.sourceFile)}`,
        '</a>',
        '</li>',
    ].join(''))
    .join('\n')

const missingSection = packagesWithoutLocalLicense.length === 0
    ? ''
    : `<h2>Packages using a family-level license</h2>
       <p>The following installed packages did not ship a separate license file. Their package family license is included above:</p>
       <ul>${packagesWithoutLocalLicense.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>`

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PistachioSwap third-party licenses</title>
  <style>
    body { max-width: 58rem; margin: 0 auto; padding: 2rem; background: #191919; color: #f5f5f5; font: 16px/1.55 system-ui, sans-serif; }
    a { color: #f4a7c3; }
    li { margin-block: 0.55rem; }
  </style>
</head>
<body>
  <main>
    <h1>Third-party licenses</h1>
    <p>Portions © 2025 Reown, Inc. All Rights Reserved.</p>
    <p>PistachioSwap uses MetaMask Connect components. Copyright ConsenSys Software Inc. 2022. All rights reserved.</p>
    <p>These are the license and notice files copied from the exact installed package versions for this build.</p>
    <ul>${licenseLinks}</ul>
    ${missingSection}
    <p><a href="/">Return to PistachioSwap</a></p>
  </main>
</body>
</html>
`

writeFileSync(join(outputDir, 'NOTICE.txt'), notice)
writeFileSync(join(outputDir, 'index.html'), html)
writeFileSync(
    join(outputDir, 'index.json'),
    `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        files: copied,
        packagesWithoutLocalLicense,
    }, null, 2)}\n`,
)

console.log(`Copied ${copied.length} third-party license or notice files to ${outputDir}`)
if (packagesWithoutLocalLicense.length > 0) {
    console.warn(`${packagesWithoutLocalLicense.length} packages rely on a copied family-level license.`)
}
