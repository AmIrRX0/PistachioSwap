'use strict'

const MAX_INPUT_BYTES = 1024 * 1024

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }
  throw new TypeError('Expected a Buffer or Uint8Array.')
}

function checkedInput(value) {
  const buffer = asBuffer(value)
  if (buffer.byteLength > MAX_INPUT_BYTES) {
    throw new RangeError(`Input exceeds the ${MAX_INPUT_BYTES}-byte safety limit.`)
  }
  return buffer
}

function checkedWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0 || width > MAX_INPUT_BYTES) {
    throw new RangeError(
      `Width must be a non-negative safe integer no greater than ${MAX_INPUT_BYTES}.`,
    )
  }
  return width
}

function checkedBigInt(value) {
  if (typeof value !== 'bigint') {
    throw new TypeError('Expected a bigint.')
  }
  if (value < 0n) {
    throw new RangeError('Negative bigint values are not supported.')
  }
  return value
}

function toBigIntBE(value) {
  const buffer = checkedInput(value)
  let result = 0n
  for (const byte of buffer) {
    result = (result << 8n) | BigInt(byte)
  }
  return result
}

function toBigIntLE(value) {
  const buffer = checkedInput(value)
  let result = 0n
  for (let index = buffer.length - 1; index >= 0; index -= 1) {
    result = (result << 8n) | BigInt(buffer[index])
  }
  return result
}

function assertFits(value, width) {
  const maximum = 1n << BigInt(width * 8)
  if (value >= maximum && width !== 0) {
    throw new RangeError(`The bigint does not fit in ${width} byte(s).`)
  }
  if (width === 0 && value !== 0n) {
    throw new RangeError('Only zero fits in a zero-width buffer.')
  }
}

function toBufferBE(value, requestedWidth) {
  let remaining = checkedBigInt(value)
  const width = checkedWidth(requestedWidth)
  assertFits(remaining, width)
  const output = Buffer.alloc(width)
  for (let index = width - 1; index >= 0; index -= 1) {
    output[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return output
}

function toBufferLE(value, requestedWidth) {
  let remaining = checkedBigInt(value)
  const width = checkedWidth(requestedWidth)
  assertFits(remaining, width)
  const output = Buffer.alloc(width)
  for (let index = 0; index < width; index += 1) {
    output[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return output
}

module.exports = {
  toBigIntBE,
  toBigIntLE,
  toBufferBE,
  toBufferLE,
}
