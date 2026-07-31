import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { evmEndpointMap, parseChainSelection, selectPchainedChains } from './pchained-registry.mjs'
import { pipePrefixed, requireCommand, run, spawnManaged, waitForHttp } from './utils.mjs'

function composeArgs(chain, overridePath) {
    return [
        'compose',
        '--project-name',
        chain.projectName,
        '--file',
        chain.composePath,
        '--file',
        overridePath,
    ]
}

function overrideContents(chain) {
    return `services:\n  api:\n    ports:\n      - "127.0.0.1:${chain.port}:3000"\n    restart: "no"\n`
}

function ensureNetwork(networkName) {
    return run('docker', ['network', 'inspect', networkName], {
        stdio: 'ignore',
    })
}

function ensureNetworkSafe(networkName) {
    try {
        ensureNetwork(networkName)
    } catch {
        run('docker', ['network', 'create', networkName])
    }
}

export function resolvePchainedSelection({ pchainedDir, argv = process.argv.slice(2), requireConfigured = true }) {
    return selectPchainedChains({
        pchainedDir,
        selection: parseChainSelection(argv),
        requireConfigured,
    })
}

export async function startPchained({ root, pchainedDir, argv = process.argv.slice(2), streamLogs = true }) {
    requireCommand('docker', 'Install Docker with the Compose plugin')
    run('docker', ['compose', 'version'], { stdio: 'ignore' })

    const { selected, unavailable } = resolvePchainedSelection({ pchainedDir, argv })
    if (selected.length === 0) {
        throw new Error(
            `No configured Pchained coinstacks were found under ${pchainedDir}. ` +
            'Create the required coinstack .env files or pass --chains with configured names.',
        )
    }

    const runtimeDir = path.join(root, '.local-services', 'pchained')
    mkdirSync(runtimeDir, { recursive: true })

    if (selected.some((chain) => chain.runtime === 'node')) {
        run('docker', [
            'compose',
            '--file',
            path.join(pchainedDir, 'docker-compose.yml'),
            'build',
            'unchained-local-node',
        ], { cwd: pchainedDir })
    }

    const sessions = []
    try {
        for (const chain of selected) {
            ensureNetworkSafe(chain.networkName)
            const overridePath = path.join(runtimeDir, `${chain.name}.override.yml`)
            writeFileSync(overridePath, overrideContents(chain), { mode: 0o600 })
            const args = composeArgs(chain, overridePath)

            if (chain.runtime === 'go') {
                const services = run('docker', [...args, 'config', '--services'], {
                    cwd: chain.baseDir,
                    encoding: 'utf8',
                    stdio: 'pipe',
                }).stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
                const builders = services.filter((service) => service !== 'api')
                if (builders.length > 0) {
                    run('docker', [...args, 'build', ...builders], { cwd: chain.baseDir })
                }
            }

            console.log(`[pchained:${chain.name}] starting on http://127.0.0.1:${chain.port}`)
            run('docker', [...args, 'up', '--detach', '--build', 'api'], { cwd: chain.baseDir })

            if (!(await waitForHttp(chain.port))) {
                try {
                    run('docker', [...args, 'logs', '--tail', '120', 'api'], { cwd: chain.baseDir })
                } catch {
                    // The original startup failure is more useful.
                }
                throw new Error(`Pchained ${chain.name} did not become reachable on port ${chain.port}`)
            }

            let logProcess = null
            if (streamLogs) {
                logProcess = spawnManaged('docker', [...args, 'logs', '--follow', '--no-color', 'api'], {
                    cwd: chain.baseDir,
                    stdio: ['ignore', 'pipe', 'pipe'],
                })
                pipePrefixed(logProcess.stdout, `pchained:${chain.name}`, process.stdout)
                pipePrefixed(logProcess.stderr, `pchained:${chain.name}`, process.stderr)
            }

            sessions.push({ chain, args, logProcess })
        }
    } catch (error) {
        stopPchainedSessions(sessions)
        throw error
    }

    if (unavailable.length > 0) {
        const skipped = unavailable
            .filter((chain) => chain.sourcePresent && !chain.configured)
            .map((chain) => chain.name)
        if (skipped.length > 0) {
            console.log(`[pchained] skipped unconfigured coinstacks: ${skipped.join(', ')}`)
        }
    }

    return {
        sessions,
        selected,
        endpoints: evmEndpointMap(selected),
    }
}

export function stopPchainedSessions(sessions, { removeContainers = true } = {}) {
    for (const session of [...sessions].reverse()) {
        session.logProcess?.kill('SIGTERM')
        try {
            const action = removeContainers
                ? ['down', '--remove-orphans']
                : ['stop', 'api']
            run('docker', [...session.args, ...action], {
                cwd: session.chain.baseDir,
                stdio: 'inherit',
            })
        } catch (error) {
            console.error(`[pchained:${session.chain.name}] cleanup failed: ${error.message}`)
        }
    }
}

export function stopPchainedFromRuntime({ root, pchainedDir, argv = process.argv.slice(2) }) {
    const { selected } = resolvePchainedSelection({
        pchainedDir,
        argv,
        requireConfigured: false,
    })
    const runtimeDir = path.join(root, '.local-services', 'pchained')
    for (const chain of selected) {
        const overridePath = path.join(runtimeDir, `${chain.name}.override.yml`)
        if (!existsSync(overridePath)) continue
        const args = composeArgs(chain, overridePath)
        try {
            run('docker', [...args, 'down', '--remove-orphans'], {
                cwd: chain.baseDir,
            })
        } catch (error) {
            console.error(`[pchained:${chain.name}] ${error.message}`)
        }
    }
}
