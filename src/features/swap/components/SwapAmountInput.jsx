import { useState } from 'react'

import { formatAmountInputDisplay } from '../model/swapDisplay.js'
import './SwapAmountInput.css'

/**
 * Renders a token- or USD-denominated amount field.
 * @param {{value: string, denomination: string, label: string, invalid?: boolean, className: string, onChange: (event: object) => void}} props Input presentation contract.
 * @returns {import('react').ReactElement} Existing amount input shell.
 * @sideEffects Emits the browser change event; no quote, RPC, or wallet work occurs here.
 */
export default function SwapAmountInput({ value, denomination, label, invalid, className, onChange }) {
    const [focused, setFocused] = useState(false)
    const isUsd = denomination === 'USD'
    const displayValue = focused ? value : formatAmountInputDisplay(value, denomination)
    return (
        <div className={['amount-input-shell', isUsd ? 'amount-input-usd' : ''].filter(Boolean).join(' ')}>
            {isUsd && <span className="amount-input-prefix" aria-hidden="true">$</span>}
            <input
                value={displayValue}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="decimal"
                placeholder="0"
                aria-label={isUsd ? `${label} USD amount` : `${label} amount`}
                aria-invalid={invalid || undefined}
                className={className}
            />
        </div>
    )
}
