import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import ChatPanel from './components/ChatPanel'
import SettingsModal from './components/SettingsModal'
import { HowTo, AppSettings } from './types'
import './App.css'

function App() {
    const [howTos, setHowTos] = useState<HowTo[]>([])
    const [selectedHowTo, setSelectedHowTo] = useState<HowTo | null>(null)
    const [settings, setSettings] = useState<AppSettings>({
        logo: null,
        basePrompt: 'minimalistic, clean design, professional',
        format: 'A4'
    })
    const [showSettings, setShowSettings] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Load data from localStorage on mount
    useEffect(() => {
        const savedHowTos = localStorage.getItem('howTos')
        const savedSettings = localStorage.getItem('settings')

        if (savedHowTos) {
            const parsed = JSON.parse(savedHowTos)
            setHowTos(parsed)
            if (parsed.length > 0) {
                setSelectedHowTo(parsed[0])
            }
        }

        if (savedSettings) {
            setSettings(JSON.parse(savedSettings))
        }
    }, [])

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
    }

    const handleGenerateNew = async (prompt: string, basePrompt: string, format: string) => {
        // 1. Create placeholder
        const tempId = Date.now().toString()
        const placeholderHowTo: HowTo = {
            id: tempId,
            title: 'Generating...',
            description: prompt,
            prompt: `${basePrompt}, ${prompt}`,
            imageUrl: null,
            versions: [],
            currentVersion: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            status: 'generating'
        }

        // 2. Add to list immediately
        setHowTos(prev => [placeholderHowTo, ...prev])

        // 3. Keep "Creating" mode active so user can add another one immediately
        // (Optional: could also select the new item, but user wants to create multiple)

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
            setHowTos(prev => prev.map(h => {
                if (h.id === tempId) {
                    return {
                        ...h,
                        title: data.title,
                        imageUrl: data.imageUrl,
                        versions: [{
                            version: 1,
                            prompt: `${basePrompt}, ${prompt}`,
                            imageUrl: data.imageUrl,
                            timestamp: new Date().toISOString()
                        }],
                        currentVersion: 1,
                        status: 'completed',
                        messages: [{
                            role: 'assistant',
                            content: `Created "${data.title}"! The visual has been generated.`,
                            timestamp: new Date().toISOString()
                        }]
                    }
                }
                return h
            }))

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
    }

    const handleUpdateHowTo = (updatedHowTo: HowTo) => {
        setHowTos(howTos.map(h => h.id === updatedHowTo.id ? updatedHowTo : h))
        setSelectedHowTo(updatedHowTo)
    }

    const handleDeleteHowTo = (id: string) => {
        setHowTos(howTos.filter(h => h.id !== id))
        if (selectedHowTo?.id === id) {
            setSelectedHowTo(howTos[0] || null)
        }
    }

    return (
        <div className="app">
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
                <Sidebar
                    howTos={howTos}
                    selectedHowTo={selectedHowTo}
                    onSelect={handleSelectHowTo}
                    onDelete={handleDeleteHowTo}
                    onCreateNew={handleCreateNew}
                />

                <Canvas
                    howTo={selectedHowTo}
                    settings={settings}
                />

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

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onSave={setSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    )
}

export default App
