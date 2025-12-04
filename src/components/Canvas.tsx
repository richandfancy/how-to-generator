import { useState } from 'react'
import { ZoomIn, ZoomOut, Download, RotateCcw, History, AlertCircle } from 'lucide-react'
import { HowTo, AppSettings } from '../types'
import './Canvas.css'

interface CanvasProps {
    howTo: HowTo | null
    settings: AppSettings
    onVersionSelect?: (version: number) => void
}

export default function Canvas({ howTo, settings, onVersionSelect }: CanvasProps) {
    const [zoom, setZoom] = useState(100)
    const [showVersions, setShowVersions] = useState(false)

    const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200))
    const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50))
    const handleResetZoom = () => setZoom(100)

    const handleDownload = () => {
        if (!howTo?.imageUrl) return

        const link = document.createElement('a')
        link.href = howTo.imageUrl
        link.download = `${howTo.title.replace(/\s+/g, '_')}_v${howTo.currentVersion}.png`
        link.click()
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="canvas">
            {/* Toolbar */}
            <div className="canvas-toolbar">
                <div className="canvas-info">
                    {howTo && (
                        <>
                            <h2 className="canvas-title truncate">{howTo.title}</h2>
                            <div className="canvas-version-badge">
                                Version {howTo.currentVersion} of {howTo.versions.length}
                            </div>
                        </>
                    )}
                </div>

                <div className="canvas-actions">
                    <div className="zoom-controls">
                        <button className="btn btn-ghost btn-icon" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <span className="zoom-level">{zoom}%</span>
                        <button className="btn btn-ghost btn-icon" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={handleResetZoom} title="Reset Zoom">
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {howTo && howTo.versions.length > 1 && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowVersions(!showVersions)}
                        >
                            <History size={18} />
                            Versions
                        </button>
                    )}

                    {howTo?.imageUrl && (
                        <>
                            <button className="btn btn-secondary" onClick={handleDownload}>
                                <Download size={18} />
                                Download
                            </button>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                Print
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas Content */}
            <div className="canvas-content">
                {!howTo ? (
                    <div className="canvas-empty">
                        <div className="empty-state">
                            <FileText size={64} className="text-muted" />
                            <h3>No How-To Selected</h3>
                            <p className="text-muted">
                                Select a how-to from the library or create a new one to get started
                            </p>
                        </div>
                    </div>
                ) : howTo.status === 'error' ? (
                    <div className="canvas-empty">
                        <div className="empty-state">
                            <AlertCircle size={64} className="text-red-500 mb-4" />
                            <h3>Generation Failed</h3>
                            <p className="text-muted">
                                Something went wrong while generating the visual.
                                <br />
                                Please try again.
                            </p>
                        </div>
                    </div>
                ) : !howTo.imageUrl ? (
                    <div className="canvas-empty">
                        <div className="empty-state">
                            <div className="loading-spinner"></div>
                            <h3>Generating Visual...</h3>
                            <p className="text-muted">
                                Please wait while we create your how-to visual
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="canvas-viewport" style={{ transform: `scale(${zoom / 100})` }}>
                        <div className="canvas-image-wrapper">
                            {settings.logo && (
                                <img
                                    src={settings.logo}
                                    alt="Logo"
                                    className="canvas-logo"
                                />
                            )}
                            <img
                                src={howTo.imageUrl}
                                alt={howTo.title}
                                className="canvas-image"
                            />
                        </div>
                    </div>
                )}

                {/* Version History Panel */}
                {showVersions && howTo && (
                    <div className="versions-panel glass">
                        <div className="versions-header">
                            <h3>Version History</h3>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setShowVersions(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="versions-list">
                            {howTo.versions.map((version) => (
                                <div
                                    key={version.version}
                                    className={`version-item ${version.version === howTo.currentVersion ? 'active' : ''}`}
                                    onClick={() => onVersionSelect && onVersionSelect(version.version)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="version-info">
                                        <span className="version-number">v{version.version}</span>
                                        <span className="version-date">
                                            {new Date(version.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    {version.changes && (
                                        <p className="version-changes">{version.changes}</p>
                                    )}
                                    <img
                                        src={version.imageUrl}
                                        alt={`Version ${version.version}`}
                                        className="version-thumbnail"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// FileText icon component (imported from lucide-react)
function FileText({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    )
}
