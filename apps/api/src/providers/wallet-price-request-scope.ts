import { AsyncLocalStorage } from 'node:async_hooks'

type WalletPriceRequestScope = {
    shapeShiftDexScreenerPricing: true
}

const walletPriceRequestScope = new AsyncLocalStorage<WalletPriceRequestScope>()

export function runWithShapeShiftDexScreenerPricing<T>(callback: () => T): T {
    return walletPriceRequestScope.run(
        { shapeShiftDexScreenerPricing: true },
        callback,
    )
}

export function usesShapeShiftDexScreenerPricing() {
    return walletPriceRequestScope.getStore()?.shapeShiftDexScreenerPricing === true
}
