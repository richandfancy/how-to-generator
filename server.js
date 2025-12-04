import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from './src/lib/supabase.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files from uploads directory (fallback for local dev)
if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
}

// Ensure uploads directory exists (only for local dev)
if (!process.env.VERCEL && !fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'))
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Helper function to escape XML characters
function escapeXML(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    })
}

// Helper function to wrap text and handle line breaks for SVG
function wrapText(text, maxLength) {
    const words = text.split(' ')
    let lines = []
    let currentLine = ''

    for (const word of words) {
        if ((currentLine + word).length > maxLength) {
            lines.push(currentLine.trim())
            currentLine = word + ' '
        } else {
            currentLine += word + ' '
        }
    }
    lines.push(currentLine.trim())
    return lines.join('\\n')
}

// Function to generate SVG from text content
function generateHowToSVG(content, title, basePrompt) {
    const lines = content.split('\\n')
    let titleText = title
    let steps = []
    let tips = []
    let currentSection = null

    lines.forEach(line => {
        if (line.startsWith('TITLE:')) {
            titleText = line.substring('TITLE:'.length).trim()
        } else if (line.startsWith('STEPS:')) {
            currentSection = 'STEPS'
        } else if (line.startsWith('TIPS:')) {
            currentSection = 'TIPS'
        } else if (currentSection === 'STEPS' && line.trim() !== '' && !line.startsWith('-')) {
            steps.push(line.trim())
        } else if (currentSection === 'TIPS' && line.startsWith('-')) {
            tips.push(line.substring('-'.length).trim())
        }
    })

    const svgWidth = 800
    const svgHeight = 1200
    const margin = 50
    const titleFontSize = 48
    const stepFontSize = 24
    const tipFontSize = 20
    const lineHeight = stepFontSize + 8
    const tipLineHeight = tipFontSize + 6

    let currentY = margin + titleFontSize + 30

    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-family: 'Arial', sans-serif;">`
    svg += `<text x="${svgWidth / 2}" y="${currentY}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXML(titleText)}</text>`
    currentY += titleFontSize + 40
    svg += `<text x="${margin}" y="${currentY}" font-size="${tipFontSize}" font-style="italic">${escapeXML(basePrompt)}</text>`
    currentY += tipFontSize + 20

    steps.forEach((step, index) => {
        const stepLines = wrapText(step, 40).split('\\n')
        svg += `<g transform="translate(${margin}, ${currentY})">`
        svg += `<circle cx="30" cy="30" r="25" fill="#f0c419" />`
        svg += `<text x="30" y="40" text-anchor="middle" font-size="${stepFontSize}" font-weight="bold" fill="#000">${index + 1}</text>`
        stepLines.forEach((line, lineIndex) => {
            svg += `<text x="${margin + 60}" y="${30 + lineIndex * lineHeight}" font-size="${stepFontSize}">${escapeXML(line)}</text>`
        })
        svg += `</g>`
        currentY += (stepLines.length * lineHeight) + 40
    })

    if (tips.length > 0) {
        svg += `<text x="${margin}" y="${currentY}" font-size="${stepFontSize}" font-weight="bold">Tips:</text>`
        currentY += stepFontSize + 20
        tips.forEach((tip, index) => {
            const tipLines = wrapText(tip, 50).split('\\n')
            svg += `<g transform="translate(${margin}, ${currentY})">`
            svg += `<text x="0" y="0" font-size="${tipFontSize}" fill="#ccc">- ${escapeXML(tipLines[0])}</text>`
            for (let i = 1; i < tipLines.length; i++) {
                svg += `<text x="0" y="${i * tipLineHeight}" font-size="${tipFontSize}" fill="#ccc">- ${escapeXML(tipLines[i])}</text>`
            }
            svg += `</g>`
            currentY += (tipLines.length * tipLineHeight) + 10
        })
    }
    currentY += 40
    svg += `<text x="${svgWidth / 2}" y="${currentY}" text-anchor="middle" font-size="16" fill="#ccc">Generated with AI</text>`
    svg += `</svg>`
    return svg
}

// Helper to upload to Supabase or Local
const saveImage = async (dataBuffer, mimeType, extension) => {
    const filename = `howto_${Date.now()}.${extension}`

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        console.log('☁️ Uploading to Supabase Storage...')
        const { data, error } = await supabase.storage
            .from('images')
            .upload(filename, dataBuffer, {
                contentType: mimeType,
                upsert: false
            })

        if (error) {
            console.error('Supabase upload error:', error)
            console.log('⚠️ Falling back to Data URI...')
            return {
                url: `data:${mimeType};base64,${dataBuffer.toString('base64')}`,
                size: (dataBuffer.length / 1024).toFixed(2) + ' KB',
                filename: null
            }
        }

        const { data: publicData } = supabase.storage
            .from('images')
            .getPublicUrl(filename)

        return {
            url: publicData.publicUrl,
            size: (dataBuffer.length / 1024).toFixed(2) + ' KB',
            filename
        }
    } else {
        console.log('💾 Saving to local storage (Supabase not configured)...')
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, 'uploads')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const filepath = path.join(uploadsDir, filename)
        fs.writeFileSync(filepath, dataBuffer)
        return {
            url: `/uploads/${filename}`,
            size: (fs.statSync(filepath).size / 1024).toFixed(2) + ' KB',
            filename
        }
    }
}


// Generate how-to visual
app.post('/api/generate', async (req, res) => {
    const requestId = Date.now()
    console.log('\n' + '='.repeat(60))
    console.log(`🔵 NEW REQUEST [${requestId}]`)
    console.log('='.repeat(60))

    try {
        const { prompt, basePrompt, format, previousImage } = req.body

        console.log('📥 Request details:')
        console.log('   Prompt:', prompt)
        console.log('   Base prompt:', basePrompt)
        console.log('   Format:', format)

        if (!process.env.GEMINI_API_KEY) {
            console.log('❌ ERROR: GEMINI_API_KEY not configured')
            return res.status(500).json({
                error: 'GEMINI_API_KEY not configured. Please add it to your .env file.'
            })
        }

        console.log('✓ API Key found:', process.env.GEMINI_API_KEY.substring(0, 10) + '...')

        // Extract title from prompt
        const titleMatch = prompt.match(/how to (.+)/i)
        const title = titleMatch
            ? `How to ${titleMatch[1].charAt(0).toUpperCase() + titleMatch[1].slice(1)}`
            : prompt.slice(0, 50)

        console.log('📝 Generated title:', title)

        // Compose the full prompt for image generation
        const fullPrompt = `Create a detailed, step-by-step visual how-to guide for: ${prompt}

Global Instructions:
${basePrompt}

Requirements:
- Format: ${format} printable layout
- Include clear numbered steps
- Use icons or illustrations for each step
- Professional and easy to understand
- Suitable for printing and display

The visual should be a complete infographic showing all steps to complete this process.`

        console.log('🚀 Starting parallel generation...')

        const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const imageModel = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' })
        const imageStartTime = Date.now()

        // Run both generations in parallel
        const [textResult, imageResult] = await Promise.all([
            // 1. Generate Text
            (async () => {
                console.log('🤖 Generating text with Gemini 2.5 Flash...')
                return textModel.generateContent({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `${fullPrompt}

Generate a detailed step-by-step how-to guide in the following format:

TITLE: [Clear title]
STEPS:
1. [First step with detailed description]
2. [Second step with detailed description]
3. [Continue with all necessary steps]

TIPS:
- [Helpful tip 1]
- [Helpful tip 2]

Make it clear, concise, and suitable for printing.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                })
            })(),

            // 2. Generate Visual
            (async () => {
                console.log('🎨 Generating visual with Gemini 3 Pro...')
                return imageModel.generateContent(fullPrompt)
            })()
        ])

        // Process Text Result
        const textResponse = textResult.response
        const text = textResponse.text()
        console.log('✓ Text generated')

        // Process Image Result
        const imageResponse = imageResult.response
        const imageTime = ((Date.now() - imageStartTime) / 1000).toFixed(2)

        let imageUrl = null
        let fileSize = '0 KB'

        if (imageResponse.candidates &&
            imageResponse.candidates[0].content &&
            imageResponse.candidates[0].content.parts &&
            imageResponse.candidates[0].content.parts[0].inlineData) {

            const part = imageResponse.candidates[0].content.parts[0]
            const data = part.inlineData.data
            const mimeType = part.inlineData.mimeType
            const ext = mimeType.split('/')[1] || 'png'

            const result = await saveImage(Buffer.from(data, 'base64'), mimeType, ext)
            imageUrl = result.url
            fileSize = result.size

            console.log(`✓ Image generated in ${imageTime}s`)
            console.log(`✓ Saved to ${result.filename} (${fileSize})`)
        } else {
            console.log('⚠️ No image data received from Gemini 3, falling back to SVG')
            // Fallback to SVG if image generation fails
            const svg = generateHowToSVG(text, title, basePrompt)
            const result = await saveImage(Buffer.from(svg), 'image/svg+xml', 'svg')
            imageUrl = result.url
            fileSize = result.size
        }

        console.log('✅ SUCCESS! Responding to client...')
        console.log('='.repeat(60) + '\n')

        res.json({
            title,
            imageUrl,
            success: true,
            content: text,
            debug: {
                textModel: 'gemini-2.5-flash',
                imageModel: 'gemini-3-pro-image-preview',
                imageTime: `${imageTime}s`,
                fileSize,
                storage: process.env.SUPABASE_URL ? 'supabase' : 'local'
            }
        })

    } catch (error) {
        console.error('❌ ERROR:', error)
        console.log('='.repeat(60) + '\n')
        res.status(500).json({
            error: 'Failed to generate image',
            details: error.message
        })
    }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        supabaseConfigured: !!process.env.SUPABASE_URL
    })
})

// Debug endpoint to test Gemini connection
app.get('/api/debug/gemini', async (req, res) => {
    res.json({ status: 'debug endpoint placeholder' })
})

// Only listen if run directly (not if imported by Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
}

export default app
