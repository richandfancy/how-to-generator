import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`)
    try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Hello')
        console.log(`✅ SUCCESS: ${modelName} is available!`)
        return true
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
            console.log(`❌ ${modelName} not found`)
        } else {
            console.log(`❌ ${modelName} error: ${error.message}`)
        }
        return false
    }
}

async function main() {
    const candidates = [
        'gemini-3.0-pro',
        'gemini-3.0-flash',
        'gemini-3-pro',
        'gemini-3-flash',
        'gemini-experimental',
        'gemini-nano',
        'gemini-pro-vision',
        'gemini-1.5-pro-latest',
        'gemini-ultra'
    ]

    console.log('Probing for Gemini 3 / Nano Banana models...')

    for (const name of candidates) {
        await testModel(name)
    }
}

main()
