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

// Lazy initialization to ensure we pick up the env var
const getGenAI = () => {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
    if (!key) {
        console.error('❌ GEMINI_API_KEY is missing in process.env')
    }
    return new GoogleGenerativeAI(key || '')
}

// ... existing helper functions ...

// Generate text content only (Step 1)
app.post('/api/generate-text', async (req, res) => {
    try {
        const { prompt, basePrompt, format } = req.body

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
            return res.status(500).json({
                error: 'GEMINI_API_KEY not configured',
                details: 'Please add GEMINI_API_KEY to your Vercel environment variables.'
            })
        }

        const fullPrompt = `Create a detailed, step-by-step visual how-to guide for: ${prompt}
// ... rest of the function ...
Global Instructions:
${basePrompt}

Requirements:
- Format: ${format} printable layout
- Include clear numbered steps
- Use icons or illustrations for each step
- Professional and easy to understand
- Suitable for printing and display

The visual should be a complete infographic showing all steps to complete this process.`

        const textModel = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })

        const textResult = await textModel.generateContent({
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

        const textResponse = textResult.response
        const text = textResponse.text()

        // Extract title
        const titleMatch = prompt.match(/how to (.+)/i)
        const title = titleMatch
            ? `How to ${titleMatch[1].charAt(0).toUpperCase() + titleMatch[1].slice(1)}`
            : prompt.slice(0, 50)

        res.json({
            success: true,
            title,
            content: text,
            fullPrompt // Return this so client can pass it to image generation
        })

    } catch (error) {
        console.error('Text generation error:', error)
        res.status(500).json({ error: 'Failed to generate text', details: error.message })
    }
})

// Generate image only (Step 2)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { fullPrompt, title, content } = req.body

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
            return res.status(500).json({
                error: 'GEMINI_API_KEY not configured',
                details: 'Please add GEMINI_API_KEY to your Vercel environment variables.'
            })
        }

        const imageModel = getGenAI().getGenerativeModel({ model: 'gemini-3-pro-image-preview' })
        const imageStartTime = Date.now()

        const imageResult = await imageModel.generateContent(fullPrompt)
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
        } else {
            // Fallback to SVG
            const svg = generateHowToSVG(content || '', title || 'How-To', '')
            const result = await saveImage(Buffer.from(svg), 'image/svg+xml', 'svg')
            imageUrl = result.url
            fileSize = result.size
        }

        res.json({
            success: true,
            imageUrl,
            debug: {
                imageTime: `${imageTime}s`,
                fileSize
            }
        })

    } catch (error) {
        console.error('Image generation error:', error)
        res.status(500).json({ error: 'Failed to generate image', details: error.message })
    }
})

// Generate how-to visual (Legacy - Parallel)
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

        const textModel = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })
        const imageModel = getGenAI().getGenerativeModel({ model: 'gemini-3-pro-image-preview' })
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
