import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure env vars are loaded if running in Node
if (typeof process !== 'undefined') {
    dotenv.config()
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found. Image uploads will fail.')
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
)
