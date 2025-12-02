# How-To Generator 🎨

An AI-powered web application for creating beautiful, printable how-to guides for gastronomical processes using Google's Gemini 3 Pro (Nano Banana Pro) image generation.

## Features

- ✨ **AI-Powered Generation**: Uses Gemini 3 Pro for high-quality visual generation
- 🎨 **Customizable Visuals**: Configure base style prompts (minimalistic, hand-drawn, etc.)
- 💬 **Chat-Based Refinement**: Iteratively improve how-tos through conversation
- 📚 **Version Control**: Track all iterations with full version history
- 🖨️ **Print-Ready**: Generate printable guides in various formats (A4, Letter, etc.)
- 🏷️ **Logo Support**: Add your custom logo to all generated guides
- 📱 **Modern UI**: Beautiful 3-panel interface with dark theme

## Prerequisites

- Node.js (v18 or higher)
- Google Gemini API Key (get it from [Google AI Studio](https://aistudio.google.com/app/apikey))

## Setup

1. **Clone/Download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

4. **Get your Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key and paste it in your `.env` file

## Running the App

You need to run both the frontend and backend servers:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev
```

Then open your browser to `http://localhost:3000` (or the URL shown in Terminal 2)

## Usage

1. **Configure Settings** (Optional)
   - Click the Settings icon in the header
   - Upload your logo
   - Set a base visual style prompt (e.g., "minimalistic, professional")
   - Choose your print format (A4, Letter, etc.)

2. **Create a New How-To**
   - Click "New How-To" button
   - Describe the process in the chat (e.g., "How to make a cappuccino")
   - Wait for the AI to generate the visual

3. **Refine Your How-To**
   - Use the chat to suggest improvements
   - Examples:
     - "Make it more colorful"
     - "Add step numbers"
     - "Use a hand-drawn style"
     - "Add icons for each step"
   - Each change creates a new version

4. **View Version History**
   - Click the "Versions" button in the canvas toolbar
   - See all previous iterations
   - Compare different versions

5. **Download or Print**
   - Click "Download" to save as PNG
   - Click "Print" for a print-ready version

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **AI**: Google Gemini 3 Pro (Nano Banana Pro)
- **Styling**: Vanilla CSS with dark theme
- **Icons**: Lucide React

## Project Structure

```
HowToGenerator/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Left panel - How-To library
│   │   ├── Canvas.tsx           # Center panel - Visual display
│   │   ├── ChatPanel.tsx        # Right panel - AI chat
│   │   └── SettingsModal.tsx    # Settings configuration
│   ├── App.tsx                  # Main app component
│   ├── types.ts                 # TypeScript definitions
│   └── index.css                # Global styles
├── server.js                    # Backend API server
├── .env                         # Environment variables (not in git)
└── package.json
```

## API Endpoints

- `POST /api/generate` - Generate or update a how-to visual
- `GET /api/health` - Health check and API status

## Troubleshooting

**"GEMINI_API_KEY not configured" error:**
- Make sure you've created a `.env` file
- Verify your API key is correct
- Restart the backend server after adding the key

**Images not generating:**
- Check that your Gemini API key has quota remaining
- Review the console logs in the backend terminal
- Ensure you're using a valid Gemini 3 Pro model

**Port already in use:**
- Change the PORT in `.env` to a different number
- Or stop the process using that port

## License

ISC

## Support

For issues or questions, please check:
- [Gemini API Documentation](https://ai.google.dev/)
- [Vite Documentation](https://vitejs.dev/)
