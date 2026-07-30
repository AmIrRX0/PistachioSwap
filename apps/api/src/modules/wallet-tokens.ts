import type { FastifyPluginAsync } from 'fastify'

import {
    runWithShapeShiftDexScreenerPricing,
} from '../providers/wallet-price-request-scope.js'
import {
    walletTokenRoutes as baseWalletTokenRoutes,
} from './wallet-tokens-base.js'

export * from './wallet-tokens-base.js'

export const walletTokenRoutes: FastifyPluginAsync = async (app, options) => {
    app.addHook('onRequest', (_request, _reply, done) => {
        runWithShapeShiftDexScreenerPricing(() => done())
    })
    await baseWalletTokenRoutes(app, options)
}
