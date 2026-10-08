import { supabase } from '../lib/supabase'
import { cachedRequest, invalidateRequestCache } from './request-cache'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const API_UNAVAILABLE_MESSAGE = 'Concourse could not reach its API. Please try again after the server is available.'

export async function apiRequest(path, options = {}) {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const userId = data.session?.user?.id ?? 'anonymous'
    if (!accessToken) throw new Error('Sign in is required.')

    const method = (options.method || 'GET').toUpperCase()
    const load = () => sendRequest(path, options, accessToken)
    if (method === 'GET') return cachedRequest(`${userId}:${path}`, load, path.startsWith('/admin/') ? 0 : undefined)
    const result = await load()
    invalidateRequestCache()
    return result
}

export { invalidateRequestCache }

async function sendRequest(path, options, accessToken) {
    let response
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            cache: 'no-store',
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...options.headers,
            },
        })
    } catch {
        throw new Error(API_UNAVAILABLE_MESSAGE)
    }

    // A Successful DELETE response has no JSON to parse.
    if (response.status === 204) {
        return null;
    }
    if (!response.headers.get('Content-Type')?.includes('application/json')) {
        const error = new Error(API_UNAVAILABLE_MESSAGE)
        error.status = response.status
        throw error
    }

    let body
    try {
        body = await response.json()
    } catch {
        throw new Error(API_UNAVAILABLE_MESSAGE)
    }

    if (!response.ok) {
        const error = new Error(
            body.error?.message ?? `Request failed with status ${response.status}`,
        )
        error.status = response.status
        error.code = body.error?.code
        throw error
    }
    return body.data
}
