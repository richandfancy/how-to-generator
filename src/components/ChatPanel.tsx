import { useState, useRef, useEffect } from 'react'
import { Send, Loader, Sparkles } from 'lucide-react'
import { HowTo, AppSettings, ChatMessage } from '../types'
import './ChatPanel.css'

interface ChatPanelProps {
    howTo: HowTo | null
    settings: AppSettings
    isCreating: boolean
    onHowToCreated: (howTo: HowTo) => void
    onHowToUpdated: (howTo: HowTo) => void
    onCancelCreate: () => void
    onGenerateNew?: (prompt: string, basePrompt: string, format: string) => void
}

export default function ChatPanel({
    howTo,
    settings,
    isCreating,
    onHowToCreated,
    onHowToUpdated,
    onCancelCreate,
    onGenerateNew
}: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [timer, setTimer] = useState(0)
    const [loadingStatus, setLoadingStatus] = useState('Thinking...')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isLoading) {
            setTimer(0)
            timerRef.current = setInterval(() => {
                setTimer(t => t + 0.1)
            }, 100)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isLoading])

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Reset messages when switching how-tos or creating new
    useEffect(() => {
        if (isCreating) {
            setMessages([{
                role: 'system',
                content: 'Describe the gastronomical process you want to create a how-to for. For example: "How to make a cappuccino", "How to pour water properly", "Which glass to use for different drinks", etc.',
                timestamp: new Date().toISOString()
            }])
        } else if (howTo) {
            // Load existing messages if available, otherwise set default
            if (howTo.messages && howTo.messages.length > 0) {
                setMessages(howTo.messages)
            } else {
                setMessages([{
                    role: 'system',
                    content: `Currently viewing: ${howTo.title}. You can refine this how-to by describing changes you'd like to make.`,
                    timestamp: new Date().toISOString()
                }])
            }
        }
    }, [howTo, isCreating])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        }

        // Optimistically update UI
        const currentMessages = [...messages, userMessage]
        setMessages(currentMessages)
        setInput('')
        setIsLoading(true)
        setLoadingStatus('Initializing...')

        try {
            if (isCreating && onGenerateNew) {
                // Parallel generation flow
                onGenerateNew(input, settings.basePrompt, settings.format)

                // Reset UI for next creation immediately
                setMessages([{
                    role: 'system',
                    content: 'Generation started! You can describe another process to create a new how-to while the previous one generates.',
                    timestamp: new Date().toISOString()
                }])
                setIsLoading(false)
                return
            }

            if (isCreating) {
                // Fallback for legacy creation (should not be reached if onGenerateNew is passed)
                // Step 1: Generate Text
                setLoadingStatus('Drafting content structure...')
                const textResponse = await fetch('/api/generate-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: input,
                        basePrompt: settings.basePrompt,
                        format: settings.format
                    })
                })

                if (!textResponse.ok) {
                    const errorData = await textResponse.json().catch(() => ({ details: textResponse.statusText }))
                    throw new Error(errorData.details || textResponse.statusText || 'Text generation failed')
                }

                const textData = await textResponse.json()

                // Step 2: Generate Image
                setLoadingStatus('Designing visual (this takes ~15s)...')
                const imageResponse = await fetch('/api/edge-generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullPrompt: textData.fullPrompt,
                        title: textData.title,
                        content: textData.content
                    })
                })

                if (!imageResponse.ok) {
                    const errorData = await imageResponse.json().catch(() => ({ details: imageResponse.statusText }))
                    throw new Error(errorData.details || imageResponse.statusText || 'Image generation failed')
                }

                const imageData = await imageResponse.json()
                setLoadingStatus('Finalizing...')


                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: `Created "${textData.title}"! The visual has been generated. You can now refine it by chatting with me.`,
                    timestamp: new Date().toISOString()
                }

                const newHowTo: HowTo = {
                    id: Date.now().toString(),
                    title: textData.title,
                    description: input,
                    prompt: `${settings.basePrompt}, ${input}`,
                    imageUrl: imageData.imageUrl,
                    versions: [{
                        version: 1,
                        prompt: `${settings.basePrompt}, ${input}`,
                        imageUrl: imageData.imageUrl,
                        timestamp: new Date().toISOString()
                    }],
                    currentVersion: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messages: [...currentMessages, assistantMessage]
                }

                onHowToCreated(newHowTo)
                setMessages(prev => [...prev, assistantMessage])

            } else if (howTo) {
                // Update existing how-to
                // Step 1: Generate Text
                setLoadingStatus('Analyzing request...')
                const textResponse = await fetch('/api/generate-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `${howTo.prompt}, ${input}`,
                        basePrompt: settings.basePrompt,
                        format: settings.format
                    })
                })

                if (!textResponse.ok) {
                    const errorData = await textResponse.json().catch(() => ({ details: textResponse.statusText }))
                    throw new Error(errorData.details || textResponse.statusText || 'Text generation failed')
                }

                const textData = await textResponse.json()

                // Step 2: Generate Image
                setLoadingStatus('Updating visual (using Edge runtime)...')
                const imageResponse = await fetch('/api/edge-generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullPrompt: textData.fullPrompt,
                        title: textData.title,
                        content: textData.content
                    })
                })

                if (!imageResponse.ok) {
                    const errorData = await imageResponse.json().catch(() => ({ details: imageResponse.statusText }))
                    throw new Error(errorData.details || imageResponse.statusText || 'Image generation failed')
                }

                const imageData = await imageResponse.json()

                const newVersion = {
                    version: howTo.versions.length + 1,
                    prompt: `${howTo.prompt}, ${input}`,
                    imageUrl: imageData.imageUrl,
                    timestamp: new Date().toISOString(),
                    changes: input
                }

                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: `Updated to version ${newVersion.version}! I've applied your changes: "${input}"`,
                    timestamp: new Date().toISOString()
                }

                const updatedHowTo: HowTo = {
                    ...howTo,
                    imageUrl: imageData.imageUrl,
                    prompt: `${howTo.prompt}, ${input}`,
                    versions: [...howTo.versions, newVersion],
                    currentVersion: newVersion.version,
                    updatedAt: new Date().toISOString(),
                    messages: [...currentMessages, assistantMessage]
                }

                onHowToUpdated(updatedHowTo)
                setMessages(prev => [...prev, assistantMessage])
            }
        } catch (error: any) {
            console.error('Error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${error.message || 'Something went wrong'}. If this persists, the request might be timing out.`,
                timestamp: new Date().toISOString()
            }])
        }

        setIsLoading(false)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-header-content">
                    <Sparkles size={20} className="text-gradient" />
                    <h2 className="chat-title">AI Assistant</h2>
                </div>
                {isCreating && (
                    <button className="btn btn-ghost" onClick={onCancelCreate}>
                        Cancel
                    </button>
                )}
            </div>

            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`chat-message ${message.role}`}
                    >
                        <div className="message-content">
                            {message.content}
                        </div>
                        <div className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="message-content">
                            <div className="flex flex-col gap-2">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                    <span className="font-mono">{timer.toFixed(1)}s</span>
                                    <span>•</span>
                                    <span>{loadingStatus}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <textarea
                    className="chat-input textarea"
                    placeholder={
                        isCreating
                            ? "Describe the process (e.g., 'How to make a cappuccino')"
                            : "Suggest changes (e.g., 'make it more colorful', 'add step numbers')"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={3}
                    disabled={isLoading || (!isCreating && !howTo)}
                />
                <button
                    className="btn btn-primary chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || (!isCreating && !howTo)}
                >
                    {isLoading ? <Loader size={18} className="animate-pulse" /> : <Send size={18} />}
                    Send
                </button>
            </div>
        </div>
    )
}
