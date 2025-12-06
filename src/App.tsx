
import { useState, useEffect } from 'react'
import { Settings, FolderOpen, Image, MessageSquare } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import ChatPanel from './components/ChatPanel'
import SettingsModal from './components/SettingsModal'
import { HowTo, AppSettings, ChatMessage } from './types'
import './App.css'

import { db } from './lib/db'

type MobileView = 'library' | 'canvas' | 'chat'

function App() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [howTos, setHowTos] = useState<HowTo[]>([])
    const [selectedHowTo, setSelectedHowTo] = useState<HowTo | null>(null)
    const [settings, setSettings] = useState<AppSettings>({
        logo: null,
        basePrompt: 'minimalistic, clean design, professional',
        format: 'A4'
    })
    const [showSettings, setShowSettings] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [mobileView, setMobileView] = useState<MobileView>('library')
    const [isMobile, setIsMobile] = useState(false)

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])


    // Load data from Supabase on mount
    useEffect(() => {
        const loadData = async () => {
            // 1. Load settings from local (settings stay local for now)
            const savedSettings = localStorage.getItem('settings')
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings))
            }

            // 2. Load How-Tos from Supabase
            const dbHowTos = await db.getAll()

            // 3. Check for local data to migrate
            const localHowTosStr = localStorage.getItem('howTos')
            if (localHowTosStr && dbHowTos.length === 0) {
                console.log('Migrating local data to Supabase...')
                const localHowTos = JSON.parse(localHowTosStr)
                for (const h of localHowTos) {
                    if (h.status !== 'generating') {
                        await db.save(h)
                    }
                }
                // Reload from DB after migration
                const migrated = await db.getAll()
                setHowTos(migrated)
                if (migrated.length > 0 && !new URLSearchParams(window.location.search).get('id')) {
                    setSelectedHowTo(migrated[0])
                }
                // Clear local storage after successful migration
                localStorage.removeItem('howTos')
            } else {
                setHowTos(dbHowTos)
                if (dbHowTos.length > 0 && !new URLSearchParams(window.location.search).get('id')) {
                    setSelectedHowTo(dbHowTos[0])
                }
            }
        }
        loadData()
    }, [])

    // Sync URL -> State
    useEffect(() => {
        if (howTos.length === 0) return

        const id = searchParams.get('id')
        const versionStr = searchParams.get('v')

        if (id) {
            const target = howTos.find(h => h.id === id)
            if (target) {
                const version = versionStr ? parseInt(versionStr) : target.currentVersion

                // Only update if different to avoid loops
                if (selectedHowTo?.id !== id || selectedHowTo?.currentVersion !== version) {
                    const targetVersion = target.versions.find(v => v.version === version)
                    if (targetVersion) {
                        setSelectedHowTo({
                            ...target,
                            currentVersion: version,
                            imageUrl: targetVersion.imageUrl
                        })
                    } else {
                        setSelectedHowTo(target)
                    }
                }
            }
        }
    }, [searchParams, howTos])

    // Sync State -> URL
    useEffect(() => {
        if (selectedHowTo && !isCreating) {
            const currentParams = new URLSearchParams(searchParams)
            if (currentParams.get('id') !== selectedHowTo.id || currentParams.get('v') !== selectedHowTo.currentVersion.toString()) {
                setSearchParams({
                    id: selectedHowTo.id,
                    v: selectedHowTo.currentVersion.toString()
                }, { replace: true })
            }
        }
    }, [selectedHowTo, isCreating])

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings))
    }, [settings])

    // REMOVED: useEffect for saving howTos to localStorage


    const handleCreateNew = () => {
        setIsCreating(true)
        setSelectedHowTo(null)
        if (isMobile) {
            setMobileView('chat')
        }
        setSearchParams({})
    }

    const handleGenerateNew = async (prompt: string, basePrompt: string, format: string) => {
        // 1. Create placeholder
        const tempId = Date.now().toString()

        const userMessage: ChatMessage = {
            role: 'user',
            content: prompt,
            timestamp: new Date().toISOString()
        }

        const placeholderHowTo: HowTo = {
            id: tempId,
            title: 'Generating...',
            description: prompt,
            prompt: `${basePrompt}, ${prompt} `,
            imageUrl: null, // Loading state
            versions: [],
            currentVersion: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [userMessage],
            status: 'generating'
        }

        // 2. Add to list immediately
        setHowTos(prev => [placeholderHowTo, ...prev])
        setSelectedHowTo(placeholderHowTo)
        setIsCreating(false)

        // Variables valid across try/catch
        let generatedTitle = 'Generation Failed'
        let generatedContent = ''
        let fullPromptForImage = ''

        try {
            // Step 1: Generate Text
            const textResponse = await fetch('/api/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, basePrompt, format })
            })

            if (!textResponse.ok) {
                const errorData = await textResponse.json().catch(() => ({ details: textResponse.statusText }))
                const specificError = errorData.error || errorData.details || textResponse.statusText
                throw new Error(specificError || 'Text generation failed')
            }

            const textData = await textResponse.json()
            generatedTitle = textData.title
            generatedContent = textData.content
            fullPromptForImage = textData.fullPrompt

            // Update title immediately
            setHowTos(prev => prev.map(h => {
                if (h.id === tempId) return { ...h, title: generatedTitle, description: 'Generating visual...' }
                return h
            }))

            // Step 2: Generate Image (Using Edge Function for longer timeout)
            const imageResponse = await fetch('/api/edge-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullPrompt: fullPromptForImage,
                    title: generatedTitle,
                    content: generatedContent
                })
            })

            if (!imageResponse.ok) {
                const errorData = await imageResponse.json().catch(() => ({ details: imageResponse.statusText }))
                const specificError = errorData.details || errorData.error || imageResponse.statusText
                throw new Error(specificError || 'Image generation failed')
            }

            const imageData = await imageResponse.json()

            // Standard Success Path
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: `Created "${generatedTitle}"! The visual has been generated.`,
                timestamp: new Date().toISOString()
            }

            const updateData = {
                title: generatedTitle,
                imageUrl: imageData.imageUrl,
                versions: [{
                    version: 1,
                    prompt: `${basePrompt}, ${prompt} `,
                    imageUrl: imageData.imageUrl,
                    timestamp: new Date().toISOString()
                }],
                currentVersion: 1,
                status: 'completed' as const,
                messages: [userMessage, assistantMessage]
            }

            const completedHowTo: HowTo = { ...placeholderHowTo, ...updateData }
            db.save(completedHowTo)

            setHowTos(prev => prev.map(h => h.id === tempId ? completedHowTo : h))
            setSelectedHowTo(prev => prev?.id === tempId ? completedHowTo : prev)

        } catch (error: any) {
            console.error('Generation error:', error)

            // FALLBACK LOGIC
            if (generatedContent && generatedTitle) {
                try {
                    console.log('⚠️ Attempting SVG fallback...')
                    const fallbackResponse = await fetch('/api/generate-svg', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: generatedTitle,
                            content: generatedContent,
                            basePrompt
                        })
                    })

                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json()

                        const fallbackMessage: ChatMessage = {
                            role: 'assistant',
                            content: `I created a text-based visual for "${generatedTitle}" because the AI image generation timed out (server busy).`,
                            timestamp: new Date().toISOString()
                        }

                        const fallbackHowTo: HowTo = {
                            ...placeholderHowTo,
                            title: generatedTitle,
                            imageUrl: fallbackData.imageUrl,
                            versions: [{
                                version: 1,
                                prompt: `${basePrompt}, ${prompt} (Fallback)`,
                                imageUrl: fallbackData.imageUrl,
                                timestamp: new Date().toISOString()
                            }],
                            currentVersion: 1,
                            status: 'completed' as const,
                            messages: [userMessage, fallbackMessage]
                        }

                        db.save(fallbackHowTo)
                        setHowTos(prev => prev.map(h => h.id === tempId ? fallbackHowTo : h))
                        setSelectedHowTo(prev => prev?.id === tempId ? fallbackHowTo : prev)
                        return // Exit function successfull with fallback
                    }
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError)
                }
            }

            // Final Error State (if normal path AND fallback failed)
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Error: ${error.message || 'Something went wrong'}.`,
                timestamp: new Date().toISOString()
            }

            const failedHowTo: HowTo = {
                ...placeholderHowTo,
                status: 'error',
                title: generatedTitle !== 'Generation Failed' ? generatedTitle : 'Generation Failed',
                description: prompt, // Ensure description is kept
                messages: [userMessage, errorMessage],
                id: tempId
            }

            setHowTos(prev => prev.map(h => h.id === tempId ? failedHowTo : h))
            setSelectedHowTo(prev => prev?.id === tempId ? failedHowTo : prev)
            db.save(failedHowTo) // Persist the error state!
        }
    }

    const handleHowToCreated = (newHowTo: HowTo) => {
        // Legacy handler, replaced by handleGenerateNew for creation
        setHowTos([newHowTo, ...howTos])
        setSelectedHowTo(newHowTo)
        setIsCreating(false)
        db.save(newHowTo)
    }

    const handleCancelCreate = () => {
        setIsCreating(false)
        if (howTos.length > 0) {
            setSelectedHowTo(howTos[0])
        }
    }

    const handleSelectHowTo = (howTo: HowTo) => {
        setSelectedHowTo(howTo)
        setIsCreating(false)
        if (isMobile) {
            setMobileView('canvas')
        }
    }

    const handleUpdateHowTo = (updatedHowTo: HowTo) => {
        setHowTos(howTos.map(h => h.id === updatedHowTo.id ? updatedHowTo : h))
        setSelectedHowTo(updatedHowTo)
        db.save(updatedHowTo)
    }

    const handleDeleteHowTo = (id: string) => {
        setHowTos(howTos.filter(h => h.id !== id))
        if (selectedHowTo?.id === id) {
            setSelectedHowTo(howTos[0] || null)
            setSearchParams({})
        }
        db.delete(id)
    }

    const handleVersionSelect = (version: number) => {
        if (!selectedHowTo) return

        const targetVersion = selectedHowTo.versions.find(v => v.version === version)
        if (targetVersion) {
            setSelectedHowTo({
                ...selectedHowTo,
                currentVersion: version,
                imageUrl: targetVersion.imageUrl
            })
        }
    }

    const handleUpdateTitle = (id: string, newTitle: string) => {
        const target = howTos.find(h => h.id === id)
        if (target) {
            const updated = { ...target, title: newTitle }
            handleUpdateHowTo(updated)
        }
    }

    return (
        <div className={`app ${isMobile ? 'is-mobile' : ''}`}>
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <h1 className="app-title">
                        <span className="text-gradient">How-To</span> Generator
                    </h1>
                    <div className="header-actions">
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setShowSettings(true)}
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main 3-Panel Layout */}
            <div className="app-main">
                <div className={`panel-sidebar ${mobileView === 'library' ? 'mobile-active' : ''}`}>
                    <Sidebar
                        howTos={howTos}
                        selectedHowTo={selectedHowTo}
                        onSelect={handleSelectHowTo}
                        onDelete={handleDeleteHowTo}
                        onCreateNew={handleCreateNew}
                        onUpdateTitle={handleUpdateTitle}
                    />
                </div>

                <div className={`panel-canvas ${mobileView === 'canvas' ? 'mobile-active' : ''}`}>
                    <Canvas
                        howTo={selectedHowTo}
                        settings={settings}
                        onVersionSelect={handleVersionSelect}
                        onUpdateTitle={handleUpdateTitle}
                    />
                </div>

                <div className={`panel-chat ${mobileView === 'chat' ? 'mobile-active' : ''}`}>
                    <ChatPanel
                        howTo={selectedHowTo}
                        settings={settings}
                        isCreating={isCreating}
                        onGenerateNew={handleGenerateNew}
                        onHowToCreated={handleHowToCreated}
                        onHowToUpdated={handleUpdateHowTo}
                        onCancelCreate={handleCancelCreate}
                    />
                </div>
            </div >

            {/* Mobile Bottom Navigation */}
            {
                isMobile && (
                    <nav className="mobile-nav">
                        <button
                            className={`mobile-nav-item ${mobileView === 'library' ? 'active' : ''}`}
                            onClick={() => setMobileView('library')}
                        >
                            <FolderOpen size={22} />
                            <span>Library</span>
                        </button>
                        <button
                            className={`mobile-nav-item ${mobileView === 'canvas' ? 'active' : ''}`}
                            onClick={() => setMobileView('canvas')}
                        >
                            <Image size={22} />
                            <span>Canvas</span>
                        </button>
                        <button
                            className={`mobile-nav-item ${mobileView === 'chat' ? 'active' : ''}`}
                            onClick={() => setMobileView('chat')}
                        >
                            <MessageSquare size={22} />
                            <span>Chat</span>
                        </button>
                    </nav>
                )
            }

            {/* Settings Modal */}
            {
                showSettings && (
                    <SettingsModal
                        settings={settings}
                        onSave={setSettings}
                        onClose={() => setShowSettings(false)}
                    />
                )
            }
        </div >
    )
}

export default App
