import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function testNanoBanana() {
    console.log('🍌 Testing Nano Banana Pro (gemini-3-pro-image-preview)...')

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' })

        const prompt = 'A detailed illustration of a cappuccino cup on a wooden table, professional style'

        console.log(`Sending prompt: "${prompt}"`)

        const result = await model.generateContent(prompt)
        const response = result.response

        console.log('Response received!')
        console.log('Candidates:', response.candidates.length)

        if (response.candidates[0].content && response.candidates[0].content.parts) {
            console.log('Parts found:', response.candidates[0].content.parts.length)

            const part = response.candidates[0].content.parts[0]

            if (part.text) {
                console.log('Text response:', part.text)
            }

            if (part.inlineData) {
                console.log('✅ IMAGE DATA FOUND!')
                console.log('MimeType:', part.inlineData.mimeType)

                // Save it
                const buffer = Buffer.from(part.inlineData.data, 'base64')
                fs.writeFileSync('test-banana.png', buffer)
                console.log('Saved to test-banana.png')
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response, null, 2))
        }
    }
}

testNanoBanana()
