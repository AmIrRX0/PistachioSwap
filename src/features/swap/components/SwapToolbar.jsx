import SwapSettingsPopover from '../../settings/components/SwapSettingsPopover.jsx'
import { SettingsIcon } from '../../../shared/components/AppIcons.jsx'

/** Renders the currently available swap mode and settings trigger without owning their state. */
export default function SwapToolbar({ tabs, activeTab, onTabSelect, settings }) {
    const swapTab = tabs.includes('Swap') ? 'Swap' : tabs[0]

    return (
        <div className="swap-toolbar">
            <nav className="swap-tabs" aria-label="Swap mode">
                {swapTab && (
                    <button
                        type="button"
                        onClick={() => onTabSelect(swapTab)}
                        className={activeTab === swapTab ? 'swap-tab active' : 'swap-tab'}
                    >
                        {swapTab}
                    </button>
                )}
            </nav>
            <SwapSettingsPopover
                settings={settings.value}
                onSettingsChange={settings.onChange}
                defaultSlippageBps={settings.defaultSlippageBps}
                recommendedSlippageBps={settings.recommendedSlippageBps}
            >
                <button type="button" className="settings-button" aria-label={settings.ariaLabel}>
                    <SettingsIcon />
                </button>
            </SwapSettingsPopover>
        </div>
    )
}
