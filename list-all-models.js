import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

async function listAllModels() {
    console.log('Fetching ALL available models from Gemini API...')
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        )

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (data.models) {
            console.log(`\nFound ${data.models.length} models:`)
            console.log('='.repeat(50))
            data.models.forEach(model => {
                console.log(`Name: ${model.name}`)
                console.log(`Display: ${model.displayName}`)
                console.log(`Description: ${model.description}`)
                console.log('-'.repeat(50))
            })
        } else {
            console.log('No models found in response')
        }

    } catch (error) {
        console.error('Error:', error.message)
    }
}

listAllModels()
