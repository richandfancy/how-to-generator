import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { AppSettings } from '../types'
import './SettingsModal.css'

interface SettingsModalProps {
    settings: AppSettings
    onSave: (settings: AppSettings) => void
    onClose: () => void
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
    const [localSettings, setLocalSettings] = useState(settings)

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLocalSettings({
                    ...localSettings,
                    logo: reader.result as string
                })
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = () => {
        onSave(localSettings)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Settings</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Logo Upload */}
                    <div className="settings-section">
                        <label className="settings-label">Logo</label>
                        <p className="settings-description">
                            Upload a logo to appear on all generated how-tos
                        </p>

                        <div className="logo-upload-area">
                            {localSettings.logo ? (
                                <div className="logo-preview">
                                    <img src={localSettings.logo} alt="Logo" />
                                    <button
                                        className="btn btn-ghost btn-icon logo-remove"
                                        onClick={() => setLocalSettings({ ...localSettings, logo: null })}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="logo-upload-label">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <Upload size={24} />
                                    <span>Click to upload logo</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Base Prompt */}
                    <div className="settings-section">
                        <label className="settings-label">Base Prompt</label>
                        <p className="settings-description">
                            Global instructions for the model (e.g., "minimalistic style", "explain like I'm 5", "use blue colors"). This is applied to every new how-to.
                        </p>
                        <input
                            type="text"
                            className="input"
                            value={localSettings.basePrompt}
                            onChange={(e) => setLocalSettings({
                                ...localSettings,
                                basePrompt: e.target.value
                            })}
                            placeholder="minimalistic, clean design, professional"
                        />
                    </div>

                    <div className="divider"></div>

                    {/* Format */}
                    <div className="settings-section">
                        <label className="settings-label">Format</label>
                        <p className="settings-description">
                            Select the output format for printing
                        </p>
                        <select
                            className="input"
                            value={localSettings.format}
                            onChange={(e) => setLocalSettings({
                                ...localSettings,
                                format: e.target.value
                            })}
                        >
                            <option value="A4">A4 (210 × 297 mm)</option>
                            <option value="Letter">Letter (8.5 × 11 in)</option>
                            <option value="Legal">Legal (8.5 × 14 in)</option>
                            <option value="Tabloid">Tabloid (11 × 17 in)</option>
                        </select>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
