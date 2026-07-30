export const unchainedLocalChains = Object.freeze([
  { chainId: 56, chain: 'BNB Chain', coinstack: 'bnbsmartchain', port: 3156, supported: true },
  { chainId: 1, chain: 'Ethereum', coinstack: 'ethereum', port: 3101, supported: false },
  { chainId: 10, chain: 'OP Mainnet', coinstack: 'optimism', port: 3110, supported: false },
  { chainId: 100, chain: 'Gnosis Chain', coinstack: 'gnosis', port: 3100, supported: false },
  { chainId: 137, chain: 'Polygon PoS', coinstack: 'polygon', port: 3137, supported: false },
  { chainId: 8453, chain: 'Base', coinstack: 'base', port: 3453, supported: false },
  { chainId: 42161, chain: 'Arbitrum One', coinstack: 'arbitrum', port: 3161, supported: false },
  { chainId: 43114, chain: 'Avalanche C-Chain', coinstack: 'avalanche', port: 3114, supported: false },
])

export function unchainedHttpUrlsJson() {
  return JSON.stringify(Object.fromEntries(
    unchainedLocalChains.filter((chain) => chain.supported).map(({ chainId, port }) => [
      String(chainId),
      `http://127.0.0.1:${port}`,
    ]),
  ))
}
