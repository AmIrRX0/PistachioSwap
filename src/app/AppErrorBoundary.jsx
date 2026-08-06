import { Component } from 'react'

import AppFatalError from './AppFatalError.jsx'

export default class AppErrorBoundary extends Component {
    state = { error: null }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error('[app-error-boundary]', error, info)
        }
    }

    render() {
        if (!this.state.error) return this.props.children

        return <AppFatalError onReload={this.props.reload} />
    }
}
