import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function listModels() {
    try {
        console.log('Fetching available models...\n')

        // Try to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
        )

        const data = await response.json()

        if (data.models) {
            console.log('Available models:')
            data.models.forEach(model => {
                console.log(`- ${model.name}`)
                if (model.supportedGenerationMethods) {
                    console.log(`  Methods: ${model.supportedGenerationMethods.join(', ')}`)
                }
            })
        } else {
            console.log('Response:', JSON.stringify(data, null, 2))
        }

    } catch (error) {
        console.error('Error:', error.message)
    }
}

listModels()
