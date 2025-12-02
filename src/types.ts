export interface HowTo {
    id: string
    title: string
    description: string
    prompt: string
    imageUrl: string | null
    versions: HowToVersion[]
    currentVersion: number
    createdAt: string
    updatedAt: string
    messages: ChatMessage[]
    status?: 'generating' | 'completed' | 'error'
}

export interface HowToVersion {
    version: number
    prompt: string
    imageUrl: string
    timestamp: string
    changes?: string
}

export interface AppSettings {
    logo: string | null
    basePrompt: string
    format: string
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
}
