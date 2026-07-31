import { existsSync } from 'node:fs'

import { stopPchainedFromRuntime } from './pchained.mjs'
import { resolveSibling } from './utils.mjs'

const root = process.cwd()
const pchainedDir = resolveSibling(root, process.env.PCHAINED_LOCAL_DIR, ['../Pchained'])

if (!existsSync(pchainedDir)) {
    console.log(`Pchained checkout is not present: ${pchainedDir}`)
    process.exit(0)
}

stopPchainedFromRuntime({ root, pchainedDir, argv: process.argv.slice(2) })
