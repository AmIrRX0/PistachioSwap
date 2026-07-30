export function normalizeApiBaseUrl(value) {
    const configured = String(value ?? '').trim()
    return (configured || '/api').replace(/\/+$/, '')
}

export const apiBaseUrl = normalizeApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL,
)
