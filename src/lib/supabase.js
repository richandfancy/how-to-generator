import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure env vars are loaded if running in Node environment
if (typeof process !== 'undefined' && typeof window === 'undefined') {
    dotenv.config()
}

// Helper to get environment variables in both Vite (client) and Node (server)
const getEnvVar = (key) => {
    // 1. Try Vite's import.meta.env (Client-side)
    // Note: Vite requires VITE_ prefix for client-side variables
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const viteKey = `VITE_${key}`
        if (import.meta.env[viteKey]) return import.meta.env[viteKey]
        if (import.meta.env[key]) return import.meta.env[key] // Fallback
    }

    // 2. Try Node's process.env (Server-side)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[key]) return process.env[key]
    }

    return undefined
}

const supabaseUrl = getEnvVar('SUPABASE_URL')
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found. Database operations will fail.')
    console.warn('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.')
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
)
