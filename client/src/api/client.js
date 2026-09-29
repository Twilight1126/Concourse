import { isSupabaseAuthEnabled, supabase } from '../lib/supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function apiRequest(path, options = {}) {
    let accessToken = null

    if (isSupabaseAuthEnabled) {
        const { data } = await supabase.auth.getSession()
        accessToken = data.session?.access_token
        if (!accessToken) throw new Error('Sign in is required.')
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
        },
    })

    // A Successful DELETE response has no JSON to parse.
    if (response.status === 204) {
        return null;
    }
    const body = await response.json()

    if (!response.ok) {
        throw new Error(
            body.error?.message ?? `Request failed with status ${response.status}`,
        )
    }
    return body.data
}
