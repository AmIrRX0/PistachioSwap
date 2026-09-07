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

import {
    REQUIRED_NOTICES,
    classifyPackagedLicense,
    displayDeclaredLicense,
} from './third-party-license-classifier.mjs'

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
const packages = []
const seen = new Set()

function safePackageName(name) {
    return name
        .replace(/^@/, '')
        .replaceAll('/', '__')
        .replaceAll(/[^a-zA-Z0-9_.-]/g, '_')
}

function copyPackageLicenseFiles(packageDir, fallbackName) {
    const packageJsonPath = join(packageDir, 'package.json')
    if (!existsSync(packageJsonPath)) return

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const name = String(packageJson.name || fallbackName)
    const version = String(packageJson.version || 'unknown')
    const packageKey = `${name}@${version}`
    if (seen.has(packageKey)) return
    seen.add(packageKey)

    const licenseFiles = readdirSync(packageDir)
        .filter((fileName) => licenseNamePattern.test(fileName))
        .sort()

    if (licenseFiles.length === 0) {
        throw new Error(
            `${packageKey} is a targeted distributed dependency but its installed package contains no LICENSE, COPYING, or NOTICE file. Review it before release.`,
        )
    }

    const licenseText = licenseFiles
        .map((fileName) => readFileSync(join(packageDir, fileName), 'utf8'))
        .join('\n\n')
    const classification = classifyPackagedLicense({
        declaredLicense: packageJson.license,
        licenseText,
    })

    if (classification.kind === 'unresolved') {
        throw new Error(
            `${packageKey} ships license material that the notice generator cannot classify safely. Review the exact installed files before release.`,
        )
    }

    const packageFiles = []
    for (const fileName of licenseFiles) {
        const destinationName = `${safePackageName(name)}__${version}__${basename(fileName)}`
        copyFileSync(
            join(packageDir, fileName),
            join(outputDir, destinationName),
        )
        const file = {
            package: name,
            version,
            sourceFile: fileName,
            outputFile: destinationName,
        }
        copied.push(file)
        packageFiles.push(file)
    }

    packages.push({
        package: name,
        version,
        declaredLicense: displayDeclaredLicense(packageJson.license),
        license: classification.label,
        classification: classification.group,
        requiredNotice: classification.requiredNotice,
        files: packageFiles,
    })
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
            copyPackageLicenseFiles(packageDir, `${scope}/${packageFolder}`)
        }
    }

    for (const packageName of exactPackages) {
        const packageDir = join(nodeModulesDir, packageName)
        if (!existsSync(packageDir) || !statSync(packageDir).isDirectory()) continue
        copyPackageLicenseFiles(packageDir, packageName)
    }
}

if (packages.length === 0 || copied.length === 0) {
    throw new Error('No targeted third-party license files were discovered.')
}

packages.sort((a, b) =>
    `${a.package}@${a.version}`.localeCompare(`${b.package}@${b.version}`),
)

function packageKeysForNotice(notice) {
    return packages
        .filter((item) => item.requiredNotice === notice)
        .map((item) => `${item.package}@${item.version}`)
}

const reownPackages = packageKeysForNotice(REQUIRED_NOTICES.reown)
const metamaskCustomPackages = packageKeysForNotice(REQUIRED_NOTICES.metamask)

function textNoticeSection(title, notice, packageKeys) {
    if (packageKeys.length === 0) return []
    return [
        title,
        notice,
        'Applies to these installed packages:',
        ...packageKeys.map((key) => `- ${key}`),
        '',
    ]
}

const notice = [
    'PistachioSwap third-party notices',
    '',
    'This file is generated from the exact installed package versions used by this build.',
    'Each third-party package remains governed by its own included license terms.',
    '',
    ...textNoticeSection(
        'Reown / WalletConnect Community License attribution',
        REQUIRED_NOTICES.reown,
        reownPackages,
    ),
    ...textNoticeSection(
        'MetaMask / ConsenSys custom-license attribution',
        REQUIRED_NOTICES.metamask,
        metamaskCustomPackages,
    ),
    'Exact license and notice files are published alongside this notice and indexed in index.json.',
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

function htmlAttributionSection(title, noticeText, packageKeys) {
    if (packageKeys.length === 0) return ''
    return `<section>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(noticeText)}</p>
      <p>Applies to these installed packages:</p>
      <ul>${packageKeys.map((key) => `<li><code>${escapeHtml(key)}</code></li>`).join('')}</ul>
    </section>`
}

const packageLinks = packages
    .map((item) => {
        const links = item.files
            .map((file) => `<a href="${encodeURIComponent(file.outputFile)}">${escapeHtml(file.sourceFile)}</a>`)
            .join(' · ')
        return `<li>
          <strong>${escapeHtml(item.package)}@${escapeHtml(item.version)}</strong>
          — ${escapeHtml(item.license)}
          <div class="meta">Declared by package metadata: ${escapeHtml(item.declaredLicense)}</div>
          <div>${links}</div>
        </li>`
    })
    .join('\n')

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PistachioSwap third-party licenses</title>
  <style>
    body { max-width: 62rem; margin: 0 auto; padding: 2rem; background: #191919; color: #f5f5f5; font: 16px/1.55 system-ui, sans-serif; }
    a { color: #f4a7c3; }
    li { margin-block: 0.7rem; }
    code { overflow-wrap: anywhere; }
    .meta { color: #bcbcbc; font-size: 0.92rem; }
  </style>
</head>
<body>
  <main>
    <h1>Third-party licenses</h1>
    <p>This page is generated from the exact installed package versions used by this build. A vendor name does not imply that every package from that vendor uses the same license.</p>
    ${htmlAttributionSection(
        'Reown / WalletConnect Community License attribution',
        REQUIRED_NOTICES.reown,
        reownPackages,
    )}
    ${htmlAttributionSection(
        'MetaMask / ConsenSys custom-license attribution',
        REQUIRED_NOTICES.metamask,
        metamaskCustomPackages,
    )}
    <section>
      <h2>Installed package license files</h2>
      <p>Each label below is derived from the package's included license text or, for standard licenses, its installed package metadata. The linked files are copied verbatim from the installed package.</p>
      <ul>${packageLinks}</ul>
    </section>
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
        notices: {
            reown: reownPackages.length > 0
                ? { text: REQUIRED_NOTICES.reown, packages: reownPackages }
                : null,
            metamask: metamaskCustomPackages.length > 0
                ? { text: REQUIRED_NOTICES.metamask, packages: metamaskCustomPackages }
                : null,
        },
        packages,
        files: copied,
    }, null, 2)}\n`,
)

console.log(`Published ${packages.length} third-party package records and ${copied.length} exact license/notice files to ${outputDir}`)
