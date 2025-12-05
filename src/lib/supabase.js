import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure env vars are loaded if running in Node environment
if (typeof process !== 'undefined' && typeof window === 'undefined') {
    dotenv.config()
}

// Helper to get environment variables in both Vite (client) and Node (server)
const getEnvVar = (key) => {
    // 1. Client-side (Vite) - explicitly check VITE_ prefixed vars
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (key === 'SUPABASE_URL') return import.meta.env.VITE_SUPABASE_URL
        if (key === 'SUPABASE_ANON_KEY') return import.meta.env.VITE_SUPABASE_ANON_KEY
    }

    // 2. Server-side (Node) - check process.env
    if (typeof process !== 'undefined' && process.env) {
        // Check for both prefixed and non-prefixed in Node
        return process.env[key] || process.env[`VITE_${key}`]
    }

    return undefined
}

const supabaseUrl = getEnvVar('SUPABASE_URL')
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY')

// Debug logging for production troubleshooting
if (!supabaseUrl) console.warn('Supabase URL missing')
if (!supabaseKey) console.warn('Supabase Key missing')

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found. Database operations will fail.')
    console.warn('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.')
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
)
