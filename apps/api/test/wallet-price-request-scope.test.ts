import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import {
    runWithShapeShiftDexScreenerPricing,
    usesShapeShiftDexScreenerPricing,
} from '../src/providers/wallet-price-request-scope.js'

describe('wallet price request scope', () => {
    it('preserves the scope across awaited work', async () => {
        expect(usesShapeShiftDexScreenerPricing()).toBe(false)

        await runWithShapeShiftDexScreenerPricing(async () => {
            expect(usesShapeShiftDexScreenerPricing()).toBe(true)
            await Promise.resolve()
            expect(usesShapeShiftDexScreenerPricing()).toBe(true)
        })

        expect(usesShapeShiftDexScreenerPricing()).toBe(false)
    })

    it('propagates from a Fastify onRequest hook into the route handler', async () => {
        const app = Fastify()
        app.addHook('onRequest', (_request, _reply, done) => {
            runWithShapeShiftDexScreenerPricing(done)
        })
        app.get('/scope', async () => ({
            active: usesShapeShiftDexScreenerPricing(),
        }))

        const response = await app.inject('/scope')
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ active: true })
        await app.close()
    })
})
