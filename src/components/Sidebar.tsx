import { FileText, Trash2, Clock, Plus, Loader } from 'lucide-react'
import { HowTo } from '../types'
import { BUILD_TIMESTAMP } from '../version'
import './Sidebar.css'

interface SidebarProps {
    howTos: HowTo[]
    selectedHowTo: HowTo | null
    onSelect: (howTo: HowTo) => void
    onDelete: (id: string) => void
    onCreateNew: () => void
}

export default function Sidebar({ howTos, selectedHowTo, onSelect, onDelete, onCreateNew }: SidebarProps) {
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        onDelete(id)
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-header-top">
                    <h2 className="sidebar-title">How-To Library</h2>
                    <span className="sidebar-count">{howTos.length}</span>
                </div>
                <button className="btn btn-primary w-full mt-4" onClick={onCreateNew}>
                    <Plus size={18} />
                    New How-To
                </button>
            </div>

            <div className="sidebar-list">
                {howTos.length === 0 ? (
                    <div className="sidebar-empty">
                        <FileText size={48} className="text-muted" />
                        <p className="text-muted">No how-tos yet</p>
                        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                            Click "New How-To" above to get started
                        </p>
                    </div>
                ) : (
                    howTos.map((howTo) => (
                        <div
                            key={howTo.id}
                            className={`sidebar-item ${selectedHowTo?.id === howTo.id ? 'active' : ''}`}
                            onClick={() => onSelect(howTo)}
                        >
                            <div className="sidebar-item-content">
                                <div className="sidebar-item-header">
                                    <FileText size={16} />
                                    <h3 className="sidebar-item-title truncate">
                                        {howTo.status === 'generating' ? 'Generating...' : howTo.title}
                                    </h3>
                                </div>
                                <p className="sidebar-item-description truncate">
                                    {howTo.description}
                                </p>
                                <div className="sidebar-item-meta">
                                    {howTo.status === 'generating' ? (
                                        <span className="sidebar-item-status text-accent flex items-center gap-1">
                                            <Loader size={12} className="animate-spin" />
                                            Generating...
                                        </span>
                                    ) : (
                                        <>
                                            <span className="sidebar-item-version">
                                                v{howTo.currentVersion}
                                            </span>
                                            <span className="sidebar-item-date">
                                                <Clock size={12} />
                                                {new Date(howTo.updatedAt).toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                className="sidebar-item-delete"
                                onClick={(e) => handleDelete(e, howTo.id)}
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>


            <div className="sidebar-footer" style={{ padding: '1rem', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                v{BUILD_TIMESTAMP}
            </div>
        </div >
    )
}
