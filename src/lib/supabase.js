import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure env vars are loaded if running in Node environment
if (typeof process !== 'undefined' && typeof window === 'undefined') {
    dotenv.config()
}

// Helper to get environment variables in both Vite (client) and Node (server)
const getEnvVar = (key) => {
    // 1. Try Vite's import.meta.env (Client-side)
    // IMPORTANT: specific access is needed for bundlers to statically replace these
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (key === 'SUPABASE_URL') {
            return import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
        }
        if (key === 'SUPABASE_ANON_KEY') {
            return import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY
        }
    }

    // 2. Try Node's process.env (Server-side)
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key]
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
