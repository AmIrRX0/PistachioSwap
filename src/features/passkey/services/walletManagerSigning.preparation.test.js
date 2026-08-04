import { describe, expect, it, vi } from 'vitest'

import { walletManagerSigningInternals } from './walletManagerSigning.js'

const ACCOUNT = '0x880c39159919700166E4612d4b7Aa344fc21CD6F'
const TOKEN = '0x21caef8a43163eea865baee23b9c2e327696a3bf'
const RPC_URL = 'https://bsc.example.test/'

function managerWithRpc(results) {
    const rpcRequest = vi.fn(async (_chainId, method) => {
        if (!(method in results)) throw new Error(`Unexpected RPC method: ${method}`)
        return results[method]
    })
    return {
        assertSigningContext: vi.fn(),
        rpcRequest,
        rpcUrlForChain: vi.fn(() => RPC_URL),
    }
}

describe('Pistachio Wallet normal transaction preparation', () => {
    it('fills nonce, gas price, and gas before a normal wallet transaction is reviewed and signed', async () => {
        const manager = managerWithRpc({
            eth_chainId: '0x38',
            eth_getTransactionCount: '0x7',
            eth_gasPrice: '0x3b9aca00',
            eth_estimateGas: '0xc350',
        })
        const context = { address: ACCOUNT, chainId: 56 }
        const data = '0x095ea7b30000000000000000000000000000000000001ff3684f28c67538d4d072c227340000000000000000000000000000000000000000000000000000000000000018'

        const prepared = await walletManagerSigningInternals.prepareNormalTransaction(
            manager,
            {
                to: TOKEN,
                data,
                value: 0n,
            },
            context,
        )

        expect(prepared.rpcUrl).toBe(RPC_URL)
        expect(prepared.request).toMatchObject({
            chainId: 56,
            from: ACCOUNT,
            to: TOKEN,
            data,
            value: 0n,
            type: 0,
            nonce: 7n,
            gasPrice: 1_000_000_000n,
            gas: 50_000n,
        })
        expect(manager.rpcRequest.mock.calls.map(([, method]) => method)).toEqual([
            'eth_chainId',
            'eth_getTransactionCount',
            'eth_gasPrice',
            'eth_estimateGas',
        ])
        expect(manager.rpcRequest.mock.calls.at(-1)[2]).toEqual([{
            from: ACCOUNT,
            to: TOKEN,
            data,
            value: '0x0',
            nonce: '0x7',
            gasPrice: '0x3b9aca00',
            type: '0x0',
        }])
        expect(manager.assertSigningContext).toHaveBeenCalledTimes(4)
    })

    it('preserves complete caller-supplied transaction fields and does not replace their nonce or gas', async () => {
        const manager = managerWithRpc({ eth_chainId: '0x38' })
        const context = { address: ACCOUNT, chainId: 56 }

        const prepared = await walletManagerSigningInternals.prepareNormalTransaction(
            manager,
            {
                to: TOKEN,
                data: '0x',
                value: 0n,
                type: 0,
                nonce: 3n,
                gas: 21_000n,
                gasPrice: 2_000_000_000n,
            },
            context,
        )

        expect(prepared.request).toMatchObject({
            nonce: 3n,
            gas: 21_000n,
            gasPrice: 2_000_000_000n,
            type: 0,
        })
        expect(manager.rpcRequest.mock.calls.map(([, method]) => method)).toEqual([
            'eth_chainId',
        ])
    })

    it('fails before transaction preparation when the selected RPC reports the wrong chain', async () => {
        const manager = managerWithRpc({ eth_chainId: '0x89' })
        const context = { address: ACCOUNT, chainId: 56 }

        await expect(walletManagerSigningInternals.prepareNormalTransaction(
            manager,
            { to: TOKEN, data: '0x', value: 0n },
            context,
        )).rejects.toMatchObject({ code: 'PISTACHIO_RPC_CHAIN_MISMATCH' })

        expect(manager.rpcRequest.mock.calls.map(([, method]) => method)).toEqual([
            'eth_chainId',
        ])
    })
})
