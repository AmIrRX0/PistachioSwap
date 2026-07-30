'use strict'

const assert = require('node:assert/strict')
const {
  toBigIntBE,
  toBigIntLE,
  toBufferBE,
  toBufferLE,
} = require('./index.cjs')

assert.equal(toBigIntBE(Buffer.from('deadbeef', 'hex')), 0xdeadbeefn)
assert.equal(toBigIntLE(Buffer.from('efbeadde', 'hex')), 0xdeadbeefn)
assert.deepEqual(toBufferBE(0xdeadbeefn, 8), Buffer.from('00000000deadbeef', 'hex'))
assert.deepEqual(toBufferLE(0xdeadbeefn, 8), Buffer.from('efbeadde00000000', 'hex'))
assert.equal(toBigIntBE(Buffer.alloc(0)), 0n)
assert.equal(toBigIntLE(Buffer.alloc(0)), 0n)
assert.deepEqual(toBufferBE(0n, 0), Buffer.alloc(0))
assert.deepEqual(toBufferLE(0n, 0), Buffer.alloc(0))
assert.throws(() => toBufferBE(-1n, 1), RangeError)
assert.throws(() => toBufferLE(256n, 1), RangeError)
assert.throws(() => toBigIntLE(Buffer.alloc(1024 * 1024 + 1)), RangeError)

console.log('Safe bigint-buffer compatibility checks passed.')
