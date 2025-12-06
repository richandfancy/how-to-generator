import { supabase } from './supabase'
import { HowTo } from '../types'

// Map DB snake_case to App camelCase
const mapFromDb = (row: any): HowTo => ({
    id: row.id,
    title: row.title,
    description: row.description,
    prompt: row.prompt,
    imageUrl: row.image_url,
    versions: row.versions || [],
    currentVersion: row.current_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: row.messages || [],
    status: row.status || 'completed' // Use DB status if available
})

// Map App camelCase to DB snake_case
const mapToDb = (howTo: HowTo) => ({
    id: howTo.id,
    title: howTo.title,
    description: howTo.description,
    prompt: howTo.prompt,
    image_url: howTo.imageUrl,
    versions: howTo.versions,
    current_version: howTo.currentVersion,
    messages: howTo.messages,
    status: howTo.status,
    updated_at: new Date().toISOString()
})

export const db = {
    async getAll() {
        const { data, error } = await supabase
            .from('how_tos')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error fetching how-tos:', error)
            return []
        }
        return data.map(mapFromDb)
    },

    async save(howTo: HowTo) {
        // Don't save placeholder/generating items to DB yet
        // if (howTo.status === 'generating') return

        // Actually, we SHOULD save 'error' and maybe 'generating' if we want persistence across reloads
        // But for now, let's at least allow everything so 'error' status saves.

        const row = mapToDb(howTo)
        const { error } = await supabase
            .from('how_tos')
            .upsert(row)

        if (error) console.error('Error saving how-to:', error)
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('how_tos')
            .delete()
            .eq('id', id)

        if (error) console.error('Error deleting how-to:', error)
    }
}
