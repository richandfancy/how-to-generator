
import { useState, useEffect } from 'react'
import { Settings, FolderOpen, Image, MessageSquare } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import ChatPanel from './components/ChatPanel'
import SettingsModal from './components/SettingsModal'
import { HowTo, AppSettings, ChatMessage } from './types'
import './App.css'

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

    // Load data from localStorage on mount
    useEffect(() => {
        const savedHowTos = localStorage.getItem('howTos')
        const savedSettings = localStorage.getItem('settings')

        if (savedHowTos) {
            const parsed = JSON.parse(savedHowTos)

            // Fix stuck generating items (interrupted by reload)
            const fixed = parsed.map((h: HowTo) => {
                if (h.status === 'generating') {
                    return {
                        ...h,
                        status: 'error' as const,
                        title: h.title === 'Generating...' ? 'Generation Interrupted' : h.title
                    }
                }
                return h
            })

            setHowTos(fixed)

            // Only select default if no URL params present
            const urlId = new URLSearchParams(window.location.search).get('id')
            if (!urlId && fixed.length > 0) {
                setSelectedHowTo(fixed[0])
            }
        }

        if (savedSettings) {
            setSettings(JSON.parse(savedSettings))
        }
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

    // Save to localStorage when data changes
    useEffect(() => {
        localStorage.setItem('howTos', JSON.stringify(howTos))
    }, [howTos])

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings))
    }, [settings])

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
            imageUrl: null,
            versions: [],
            currentVersion: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [userMessage],
            status: 'generating'
        }

        // 2. Add to list immediately
        setHowTos(prev => [placeholderHowTo, ...prev])

        // 3. Select the new item and exit creation mode so user can refine it
        setSelectedHowTo(placeholderHowTo)
        setIsCreating(false)

        try {
            // 4. Call API in background
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    basePrompt,
                    format
                })
            })

            const data = await response.json()

            // 5. Update placeholder with real data
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: `Created "${data.title}"! The visual has been generated.`,
                timestamp: new Date().toISOString()
            }

            const updateData = {
                title: data.title,
                imageUrl: data.imageUrl,
                versions: [{
                    version: 1,
                    prompt: `${basePrompt}, ${prompt} `,
                    imageUrl: data.imageUrl,
                    timestamp: new Date().toISOString()
                }],
                currentVersion: 1,
                status: 'completed' as const,
                messages: [userMessage, assistantMessage]
            }

            setHowTos(prev => prev.map(h => {
                if (h.id === tempId) {
                    return { ...h, ...updateData }
                }
                return h
            }))

            setSelectedHowTo(prev => {
                if (prev?.id === tempId) {
                    // We need to cast prev to HowTo to satisfy TS, though the check implies it exists
                    return { ...prev!, ...updateData }
                }
                return prev
            })

        } catch (error) {
            console.error('Generation error:', error)
            setHowTos(prev => prev.map(h => {
                if (h.id === tempId) {
                    return { ...h, status: 'error', title: 'Generation Failed' }
                }
                return h
            }))
        }
    }

    const handleHowToCreated = (newHowTo: HowTo) => {
        // Legacy handler, replaced by handleGenerateNew for creation
        setHowTos([newHowTo, ...howTos])
        setSelectedHowTo(newHowTo)
        setIsCreating(false)
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
    }

    const handleDeleteHowTo = (id: string) => {
        setHowTos(howTos.filter(h => h.id !== id))
        if (selectedHowTo?.id === id) {
            setSelectedHowTo(howTos[0] || null)
            setSearchParams({})
        }
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
                    />
                </div>

                <div className={`panel-canvas ${mobileView === 'canvas' ? 'mobile-active' : ''}`}>
                    <Canvas
                        howTo={selectedHowTo}
                        settings={settings}
                        onVersionSelect={handleVersionSelect}
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
