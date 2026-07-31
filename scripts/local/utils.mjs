import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'

export function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        encoding: options.encoding,
        stdio: options.stdio ?? 'inherit',
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`)
    }
    return result
}

export function commandExists(command) {
    const probe = process.platform === 'win32' ? ['where', command] : ['sh', '-lc', `command -v ${command}`]
    return spawnSync(probe[0], probe.slice(1), { stdio: 'ignore' }).status === 0
}

export function requireCommand(command, help = '') {
    if (commandExists(command)) return
    throw new Error(`Required command is missing: ${command}${help ? ` (${help})` : ''}`)
}

export function readDotEnv(filePath) {
    const values = {}
    if (!existsSync(filePath)) return values
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
        if (!match) continue
        let value = match[2]
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        values[match[1]] = value
    }
    return values
}

export function resolveSibling(root, explicit, candidates) {
    if (explicit) return path.resolve(root, explicit)
    for (const candidate of candidates) {
        const resolved = path.resolve(root, candidate)
        if (existsSync(resolved)) return resolved
    }
    return path.resolve(root, candidates[0])
}

export function verifyRepository(directory, expectedSuffix) {
    if (!existsSync(path.join(directory, '.git'))) {
        throw new Error(`Git repository is missing: ${directory}`)
    }
    const result = run('git', ['-C', directory, 'remote', 'get-url', 'origin'], {
        encoding: 'utf8',
        stdio: 'pipe',
    })
    const remote = result.stdout.trim().replace(/\.git$/, '')
    if (!remote.endsWith(expectedSuffix.replace(/\.git$/, ''))) {
        throw new Error(`Unexpected origin for ${directory}. Expected ${expectedSuffix}, got ${remote}`)
    }
}

export async function waitForHttp(port, { host = '127.0.0.1', timeoutMs = 180_000 } = {}) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://${host}:${port}/`, {
                signal: AbortSignal.timeout(4_000),
                redirect: 'manual',
            })
            if (response.status > 0) return true
        } catch {
            // The service may still be booting.
        }
        await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
    return false
}

export function canConnect(port, host = '127.0.0.1', timeoutMs = 750) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ port, host })
        const done = (value) => {
            socket.destroy()
            resolve(value)
        }
        socket.setTimeout(timeoutMs)
        socket.once('connect', () => done(true))
        socket.once('timeout', () => done(false))
        socket.once('error', () => done(false))
    })
}

export function spawnManaged(command, args, options = {}) {
    return spawn(command, args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: options.stdio ?? 'inherit',
        detached: false,
    })
}

export function pipePrefixed(stream, prefix, destination) {
    if (!stream) return
    let remainder = ''
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
        const lines = `${remainder}${chunk}`.split(/\r?\n/)
        remainder = lines.pop() ?? ''
        for (const line of lines) destination.write(`[${prefix}] ${line}\n`)
    })
    stream.on('end', () => {
        if (remainder) destination.write(`[${prefix}] ${remainder}\n`)
    })
}
