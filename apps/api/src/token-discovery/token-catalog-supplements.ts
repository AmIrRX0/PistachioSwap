import { normalizeAddress } from '../lib/address.js'
import { getTokenDiscoveryChain } from './registry.js'

export type TokenCatalogSupplement = {
    assetId: string
    chainId: number
    address: string
    isNative: false
    name: string
    symbol: string
    decimals: number
    icon: string
    source: 'supplement'
    searchAliases: string[]
    reference: string
}

const XAUT0_ICON =
    'https://coin-images.coingecko.com/coins/images/66560/large/XAUt0_Token_Icon_Gold.png?1749747942'
const XAUT0_REFERENCE =
    'https://usdt0.gitbook.io/xaut0/technical-documentation/developer'

const RAW_SUPPLEMENTS = [
    {
        chainId: 42161,
        address: '0x40461291347e1ecbb09499f3371d3f17f10d7159',
    },
    {
        chainId: 137,
        address: '0xf1815bd50389c46847f0bda824ec8da914045d14',
    },
    {
        chainId: 43114,
        address: '0x2775d5105276781b4b85ba6ea6a6653beed1dd32',
    },
    {
        chainId: 42220,
        address: '0xaf37e8b6c9ed7f6318979f56fc287d76c30847ff',
    },
] as const

/**
 * Small reviewed overlay for official deployments that are newer than the
 * pinned ShapeShift snapshot. It affects discovery/display only and grants no
 * Gas Assist, execution, approval, pricing, or portfolio trust.
 */
export const TOKEN_CATALOG_SUPPLEMENTS: TokenCatalogSupplement[] =
    RAW_SUPPLEMENTS.flatMap(({ chainId, address }) => {
        const normalizedAddress = normalizeAddress(address)
        if (!normalizedAddress || !getTokenDiscoveryChain(chainId)?.active) return []
        return [{
            assetId: `eip155:${chainId}/erc20:${normalizedAddress}`,
            chainId,
            address: normalizedAddress,
            isNative: false as const,
            name: 'Tether Gold (XAUt0)',
            symbol: 'XAUt0',
            decimals: 6,
            icon: XAUT0_ICON,
            source: 'supplement' as const,
            searchAliases: ['XAUT', 'XAUt', 'XAUt0', 'Tether Gold'],
            reference: XAUT0_REFERENCE,
        }]
    })
