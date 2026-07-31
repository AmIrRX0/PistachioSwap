import { existsSync } from 'node:fs'

import { startPchained, stopPchainedFromRuntime } from './pchained.mjs'
import { resolveSibling } from './utils.mjs'

const [action = 'status', ...rest] = process.argv.slice(2)
const root = process.cwd()
const pchainedDir = resolveSibling(root, process.env.PCHAINED_LOCAL_DIR, ['../Pchained'])

if (!existsSync(pchainedDir)) {
    throw new Error(`Pchained checkout is missing: ${pchainedDir}`)
}

if (action === 'up') {
    const result = await startPchained({ root, pchainedDir, argv: rest, streamLogs: false })
    console.log(`Started ${result.selected.length} Pchained coinstack(s).`)
} else if (action === 'down') {
    stopPchainedFromRuntime({ root, pchainedDir, argv: rest })
} else if (action === 'status') {
    await import('./status.mjs')
} else {
    throw new Error(`Unknown Pchained action: ${action}`)
}
