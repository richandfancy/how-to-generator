#!/usr/bin/env node

/**
 * Full Flow Test Script for How-To Generator
 * 
 * This script tests the complete workflow:
 * 1. Sends a prompt to the API
 * 2. Receives the generated how-to with SVG
 * 3. Verifies the image was created
 * 4. Displays the result
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_URL = 'http://localhost:3001/api/generate'
const FRONTEND_URL = 'http://localhost:3000'

// Test prompts
const TEST_PROMPTS = [
    'How to make a cappuccino',
    'How to pour water into a glass',
    'How to brew the perfect espresso',
]

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
}

function log(color, emoji, message) {
    console.log(`${color}${emoji} ${message}${colors.reset}`)
}

async function testHowToGeneration(prompt, basePrompt = 'minimalistic, clean design, professional', format = 'A4') {
    log(colors.cyan, '🚀', `Testing: "${prompt}"`)
    log(colors.blue, '📤', 'Sending request to API...')

    try {
        const startTime = Date.now()

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                basePrompt,
                format
            })
        })

        const data = await response.json()
        const duration = ((Date.now() - startTime) / 1000).toFixed(2)

        if (!response.ok) {
            log(colors.red, '❌', `API Error: ${data.error || 'Unknown error'}`)
            if (data.details) {
                console.log(colors.red + '   Details: ' + data.details + colors.reset)
            }
            return false
        }

        log(colors.green, '✅', `Response received in ${duration}s`)
        log(colors.blue, '📋', `Title: "${data.title}"`)
        log(colors.blue, '🖼️', `Image URL: ${data.imageUrl}`)

        // Verify the SVG file was created
        if (data.imageUrl) {
            const svgPath = path.join(__dirname, data.imageUrl)
            if (fs.existsSync(svgPath)) {
                const stats = fs.statSync(svgPath)
                log(colors.green, '✓', `SVG file created: ${(stats.size / 1024).toFixed(2)} KB`)

                // Show first few lines of content
                if (data.content) {
                    log(colors.magenta, '📝', 'Generated content preview:')
                    const lines = data.content.split('\n').slice(0, 5)
                    lines.forEach(line => {
                        if (line.trim()) {
                            console.log(colors.yellow + '   ' + line.substring(0, 70) + colors.reset)
                        }
                    })
                }

                log(colors.cyan, '🌐', `View in browser: ${FRONTEND_URL}`)
                log(colors.cyan, '🖼️', `Direct SVG: http://localhost:3001${data.imageUrl}`)

                return {
                    success: true,
                    data,
                    svgPath,
                    duration
                }
            } else {
                log(colors.red, '❌', 'SVG file not found at: ' + svgPath)
                return false
            }
        } else {
            log(colors.yellow, '⚠️', 'No image URL in response')
            return false
        }

    } catch (error) {
        log(colors.red, '❌', `Error: ${error.message}`)
        return false
    }
}

async function checkServers() {
    log(colors.blue, '🔍', 'Checking if servers are running...')

    try {
        // Check backend
        const backendResponse = await fetch('http://localhost:3001/api/health')
        const backendData = await backendResponse.json()

        if (backendData.status === 'ok') {
            log(colors.green, '✓', 'Backend server is running')
            log(colors.blue, '  ', `Gemini API: ${backendData.geminiConfigured ? '✓ Configured' : '✗ Not configured'}`)
        } else {
            log(colors.red, '✗', 'Backend server is not healthy')
            return false
        }

        // Check frontend
        try {
            await fetch(FRONTEND_URL)
            log(colors.green, '✓', 'Frontend server is running')
        } catch {
            log(colors.yellow, '⚠️', 'Frontend server may not be running (optional for this test)')
        }

        return true
    } catch (error) {
        log(colors.red, '❌', 'Servers not running. Please start them with: npm run server & npm run dev')
        return false
    }
}

async function main() {
    console.log('\n' + colors.magenta + '════════════════════════════════════════')
    console.log('  How-To Generator - Full Flow Test')
    console.log('════════════════════════════════════════' + colors.reset + '\n')

    // Check servers
    const serversRunning = await checkServers()
    if (!serversRunning) {
        process.exit(1)
    }

    console.log('')

    // Get prompt from command line or use default
    const prompt = process.argv[2] || TEST_PROMPTS[0]

    // Run test
    const result = await testHowToGeneration(prompt)

    console.log('\n' + colors.magenta + '════════════════════════════════════════' + colors.reset)

    if (result && result.success) {
        console.log(colors.green + '✅ Test PASSED!' + colors.reset)
        console.log('\nNext steps:')
        console.log(colors.cyan + '1. Open browser to: ' + FRONTEND_URL + colors.reset)
        console.log(colors.cyan + '2. Click "New How-To"' + colors.reset)
        console.log(colors.cyan + '3. Enter a prompt and click Send' + colors.reset)
        console.log(colors.cyan + '4. See your generated how-to appear!' + colors.reset)
        process.exit(0)
    } else {
        console.log(colors.red + '❌ Test FAILED' + colors.reset)
        process.exit(1)
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        log(colors.red, '💥', `Fatal error: ${error.message}`)
        process.exit(1)
    })
}

export { testHowToGeneration, checkServers }
