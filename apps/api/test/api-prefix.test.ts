import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

const previousNodeEnv = process.env.NODE_ENV

function restoreNodeEnv() {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
}

describe('production API proxy prefix', () => {
    afterEach(() => {
        restoreNodeEnv()
    })

    it('serves health on direct and reverse-proxy paths', async () => {
        process.env.NODE_ENV = 'test'
        const app = createApp()

        try {
            const [direct, proxied] = await Promise.all([
                app.inject({ method: 'GET', url: '/health' }),
                app.inject({ method: 'GET', url: '/api/health' }),
            ])

            expect(direct.statusCode).toBe(200)
            expect(proxied.statusCode).toBe(200)
            expect(proxied.json()).toEqual(direct.json())
            expect(proxied.json()).toEqual({ status: 'ok', chainId: 56 })
        } finally {
            await app.close()
        }
    })

    it('serves the token catalog under the reverse-proxy prefix', async () => {
        process.env.NODE_ENV = 'test'
        const app = createApp()

        try {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/token-catalog?chainId=56&mode=all&limit=1',
            })

            expect(response.statusCode).toBe(200)
            expect(response.json()).toMatchObject({
                schemaVersion: 1,
                tokens: expect.any(Array),
            })
        } finally {
            await app.close()
        }
    })
})
