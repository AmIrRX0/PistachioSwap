import { spawnSync } from 'node:child_process'
import { checkBnbConfig, ensureUpstream } from './prepare-bnb.mjs'

function run(args, stdio = 'inherit') {
  const result = spawnSync('docker', ['compose', '-f', 'docker-compose.unchained.yml', ...args], { stdio })
  if (result.status !== 0) process.exit(result.status ?? 1)
  return result
}

checkBnbConfig({ writeEnv: true })
ensureUpstream()
run(['up', '-d', '--build', 'unchained-bnbsmartchain-api'])

const deadline = Date.now() + 180_000
while (Date.now() < deadline) {
  const result = spawnSync('docker', ['inspect', '-f', '{{.State.Health.Status}}', 'pistachio-unchained-bnbsmartchain-api'], { encoding: 'utf8' })
  if (result.stdout.trim() === 'healthy') {
    console.log('BNB Unchained API is healthy at http://127.0.0.1:3156')
    process.exit(0)
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000)
}

console.error('BNB Unchained API did not become healthy before timeout.')
run(['logs', '--tail', '80', 'unchained-bnbsmartchain-api'])
process.exit(1)
