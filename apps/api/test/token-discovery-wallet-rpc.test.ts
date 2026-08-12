import { describe, expect, it } from 'vitest'

import { getTokenDiscoveryChain } from '../src/token-discovery/registry.js'

describe('wallet RPC coverage registry', () => {
    it.each([
        [34443, 'mode-mainnet'],
        [1088, 'metis-mainnet'],
        [1284, 'moonbeam-mainnet'],
    ])('keeps chain %i on its verified Alchemy network', (chainId, network) => {
        const chain = getTokenDiscoveryChain(chainId)

        expect(chain?.providers.alchemyNetwork).toBe(network)
        expect(chain?.capabilities.alchemy).toBe(true)
        expect(chain?.capabilities.rpcFallback).toBe(true)
    })
})
