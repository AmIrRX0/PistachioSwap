import { describe, expect, it } from 'vitest'

import { normalizeApiBaseUrl } from './apiBaseUrl.js'

describe('normalizeApiBaseUrl', () => {
    it('defaults missing and blank values to /api', () => {
        expect(normalizeApiBaseUrl()).toBe('/api')
        expect(normalizeApiBaseUrl('')).toBe('/api')
        expect(normalizeApiBaseUrl('   ')).toBe('/api')
    })

    it('removes trailing slashes', () => {
        expect(normalizeApiBaseUrl('/api/')).toBe('/api')
        expect(normalizeApiBaseUrl('https://pistachioswap.com/api/')).toBe(
            'https://pistachioswap.com/api',
        )
    })

    it('preserves relative and absolute API bases', () => {
        expect(normalizeApiBaseUrl('/api')).toBe('/api')
        expect(normalizeApiBaseUrl('https://pistachioswap.com/api')).toBe(
            'https://pistachioswap.com/api',
        )
    })
})
