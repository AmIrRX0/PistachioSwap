import type {
    FastifyPluginAsync,
    FastifyReply,
    FastifyRequest,
} from 'fastify'

const INTERNAL_TOKEN_HEADER = 'x-pistachio-internal-token'
const DEFAULT_SERVICE_URL = 'http://127.0.0.1:3002'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])
const FORWARDED_RESPONSE_HEADERS = [
    'content-type',
    'retry-after',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
] as const

type ProxyConfig = {
    baseUrl: URL
    internalToken: string
    timeoutMs: number
    maximumResponseBytes: number
}

function readBoolean(name: string, fallback: boolean) {
    const value = process.env[name]?.trim().toLowerCase()
    if (!value) return fallback
    if (value === 'true') return true
    if (value === 'false') return false
    throw new Error(`${name} must be either true or false.`)
}

function readInteger(
    name: string,
    fallback: number,
    minimum: number,
    maximum: number,
) {
    const raw = process.env[name]?.trim()
    if (!raw) return fallback
    const value = Number(raw)
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`)
    }
    return value
}

function readServiceUrl() {
    const value = process.env.GAS_ASSIST_SERVICE_URL?.trim() || DEFAULT_SERVICE_URL
    const url = new URL(value)
    const local = LOOPBACK_HOSTS.has(url.hostname)

    if (
        url.username ||
        url.password ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    ) {
        throw new Error(
            'GAS_ASSIST_SERVICE_URL must be HTTPS or a localhost HTTP URL without embedded credentials.',
        )
    }

    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    url.search = ''
    url.hash = ''
    return url
}

export function readGasAssistProxyConfig(): ProxyConfig | null {
    if (!readBoolean('GAS_ASSIST_SERVICE_ENABLED', false)) return null

    const internalToken = process.env.GAS_ASSIST_INTERNAL_TOKEN?.trim() ?? ''
    if (internalToken.length < 32) {
        throw new Error(
            'GAS_ASSIST_INTERNAL_TOKEN must contain at least 32 characters when the private service proxy is enabled.',
        )
    }

    return {
        baseUrl: readServiceUrl(),
        internalToken,
        timeoutMs: readInteger(
            'GAS_ASSIST_SERVICE_TIMEOUT_MS',
            DEFAULT_TIMEOUT_MS,
            1_000,
            60_000,
        ),
        maximumResponseBytes: readInteger(
            'GAS_ASSIST_SERVICE_MAX_RESPONSE_BYTES',
            DEFAULT_MAX_RESPONSE_BYTES,
            1_024,
            8 * 1024 * 1024,
        ),
    }
}

/*
 * The router matches the raw request target while `URL` collapses dot
 * segments, so the two disagree about what the path is. Every consumer below
 * must therefore work from one resolved path, and that path is only accepted
 * when it still sits under a proxied prefix after normalization. Without this,
 * `/v1/gas-assist/../../anything` matches the wildcard route and is forwarded
 * to the private service carrying the internal token.
 */
const PROXIED_PATH_PREFIX = /^\/v1\/(?:gas-assist|sponsorship)\//
const ENCODED_PATH_SEPARATOR = /%2e|%2f|%5c/i

function resolvePublicPath(rawUrl: string) {
    const rawPathname = rawUrl.split('#')[0].split('?')[0]
    if (ENCODED_PATH_SEPARATOR.test(rawPathname)) return null
    if (rawPathname.split('/').some((segment) =>
        segment === '.' || segment === '..',
    )) return null

    const parsed = new URL(rawUrl, 'http://pistachio.local')
    const publicPathname = parsed.pathname.startsWith('/api/v1/')
        ? parsed.pathname.slice('/api'.length)
        : parsed.pathname
    if (!PROXIED_PATH_PREFIX.test(publicPathname)) return null

    return { publicPathname, search: parsed.search }
}

function disabledResponse(publicPathname: string) {
    if (publicPathname === '/v1/gas-assist/config') {
        return { enabled: false, mode: 'disabled' }
    }
    if (publicPathname === '/v1/sponsorship/config') {
        return { enabled: false, chainId: 56 }
    }
    return null
}

function requestBody(request: FastifyRequest) {
    if (request.method === 'GET' || request.method === 'HEAD') return undefined
    if (request.body === undefined) return undefined
    return JSON.stringify(request.body)
}

function targetUrl(
    resolved: { publicPathname: string, search: string },
    baseUrl: URL,
) {
    const target = new URL(baseUrl)
    const basePath = target.pathname.replace(/\/+$/, '')
    target.pathname = `${basePath}${resolved.publicPathname}`
        .replace(/\/{2,}/g, '/')
    target.search = resolved.search
    return target
}

function proxyHeaders(request: FastifyRequest, config: ProxyConfig) {
    const headers = new Headers({
        accept: 'application/json',
        'content-type': 'application/json',
        [INTERNAL_TOKEN_HEADER]: config.internalToken,
        'x-pistachio-client-ip': request.ip,
        'x-pistachio-client-proto': request.protocol,
    })

    const authorization = request.headers.authorization
    if (typeof authorization === 'string') {
        headers.set('authorization', authorization)
    }

    const idempotencyKey = request.headers['idempotency-key']
    if (typeof idempotencyKey === 'string') {
        headers.set('idempotency-key', idempotencyKey)
    }

    return headers
}

async function readBoundedResponse(response: Response, maximumBytes: number) {
    const declaredLength = Number(response.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
        throw new Error('The private Gas Assist response exceeded the configured limit.')
    }

    const body = Buffer.from(await response.arrayBuffer())
    if (body.byteLength > maximumBytes) {
        throw new Error('The private Gas Assist response exceeded the configured limit.')
    }
    return body
}

function applyResponseHeaders(response: Response, reply: FastifyReply) {
    for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = response.headers.get(name)
        if (value) reply.header(name, value)
    }
    reply.header('cache-control', 'private, no-store, max-age=0')
}

export async function proxyGasAssistRequest(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const config = readGasAssistProxyConfig()
    const resolved = resolvePublicPath(request.raw.url || request.url)

    if (!resolved) {
        return reply.code(404).send({
            error: {
                code: 'GAS_ASSIST_ROUTE_NOT_FOUND',
                message: 'This Gas Assist route does not exist.',
            },
        })
    }

    if (!config) {
        const disabled = disabledResponse(resolved.publicPathname)
        if (disabled) return disabled
        return reply.code(503).send({
            error: {
                code: 'GAS_ASSIST_DISABLED',
                message: 'Gas Assist is unavailable.',
            },
        })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
    timeout.unref()

    try {
        const response = await fetch(targetUrl(resolved, config.baseUrl), {
            method: request.method,
            headers: proxyHeaders(request, config),
            body: requestBody(request),
            redirect: 'error',
            signal: controller.signal,
        })
        const body = await readBoundedResponse(
            response,
            config.maximumResponseBytes,
        )
        applyResponseHeaders(response, reply)
        return reply.code(response.status).send(body)
    } catch (error) {
        request.log.error(
            {
                subsystem: 'gas-assist-proxy',
                err: error,
            },
            'Private Gas Assist request failed',
        )
        return reply.code(503).send({
            error: {
                code: 'GAS_ASSIST_UNAVAILABLE',
                message: 'Gas Assist is temporarily unavailable.',
            },
        })
    } finally {
        clearTimeout(timeout)
    }
}

export const gasAssistProxyRoutes: FastifyPluginAsync = async (app) => {
    app.route({
        method: ['GET', 'POST'],
        url: '/v1/gas-assist/*',
        handler: proxyGasAssistRequest,
    })
    app.route({
        method: ['GET', 'POST'],
        url: '/v1/sponsorship/*',
        handler: proxyGasAssistRequest,
    })
}
