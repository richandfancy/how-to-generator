# How-To Generator - Setup Complete! 🎉

## What's Been Built

I've created a **beautiful, modern AI-powered How-To Generator** web application for gastronomical processes. Here's what you have:

### ✨ Core Features

1. **3-Panel Interface**
   - **Left Panel**: Library of all your how-tos with versioning info
   - **Center Panel**: Visual canvas with zoom, download, and print capabilities
   - **Right Panel**: AI chat for creating and refining how-tos

2. **AI-Powered Generation**
   - Uses **Google Gemini 3 Pro** (Nano Banana Pro) for image generation
   - Creates step-by-step visual guides
   - Supports iterative refinement through chat

3. **Customization**
   - Upload your own logo (appears on all how-tos)
   - Define base visual style (minimalistic, hand-drawn, etc.)
   - Choose print format (A4, Letter, Legal, Tabloid)

4. **Version Control**
   - Every refinement creates a new version
   - View version history
   - Track all changes

5. **Print-Ready Output**
   - Download as PNG
   - Print-optimized layout
   - Multiple format support

### 🎨 Design Highlights

- **Modern Dark Theme** with vibrant accent colors
- **Glassmorphism** effects
- **Smooth animations** and micro-interactions
- **Inter font** from Google Fonts for premium typography
- **Responsive** layout (works on different screen sizes)

## 🚀 How to Use

### First Time Setup

1. **Get a Gemini API Key** (FREE to start!)
   - Go to https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key

2. **Add the API Key**
   - Open the `.env` file in your project
   - Replace `your_gemini_api_key_here` with your actual key
   - Save the file

3. **Restart the servers** (if already running)
   - Stop both servers (Ctrl+C in both terminals)
   - Run them again

### Running the App

**Option 1: Using the start script** (easiest)
```bash
./start.sh
```

**Option 2: Manual start** (two separate terminals)

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Then open: **http://localhost:3000**

## 📝 Usage Examples

### Creating a New How-To

1. Click **"New How-To"** button in the header
2. In the chat, describe your process:
   - "How to make a cappuccino"
   - "How to properly pour water into a glass"
   - "Which glass to use for red wine vs white wine"
   - "How to create latte art"
3. Wait for the AI to generate the visual (takes 10-30 seconds)
4. The visual appears in the center canvas!

### Refining a How-To

Once a how-to is created, you can refine it by chatting:

**Example refinements:**
- "Make it more colorful and vibrant"
- "Add numbered steps"
- "Use a minimalistic style"
- "Add icons for each step"
- "Make it hand-drawn style"
- "Emphasize the milk frothing step"
- "Add a warning about hot water"

Each refinement creates a new version!

### Settings Configuration

1. Click the **Settings** icon (⚙️) in the header
2. **Upload Logo**: Click to upload your company/personal logo
3. **Visual Style Prompt**: Set default style for all how-tos
   - Examples: "minimalistic, professional", "hand-drawn, playful", "black and white, elegant"
4. **Format**: Choose print size (A4, Letter, etc.)
5. Click **"Save Settings"**

## 🏗️ Project Structure

```
HowToGenerator/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Left panel - library
│   │   ├── Canvas.tsx           # Center - visual display
│   │   ├── ChatPanel.tsx        # Right - AI chat
│   │   └── SettingsModal.tsx    # Settings dialog
│   ├── App.tsx                  # Main app
│   ├── types.ts                 # TypeScript types
│   └── index.css                # Design system
├── server.js                    # Backend API
├── .env                         # Your API key (DON'T commit!)
├── README.md                    # Full documentation
└── start.sh                     # Easy startup script
```

## 🔧 Technical Details

### Frontend
- **React 19** with TypeScript
- **Vite 5** for fast development
- **Vanilla CSS** with modern design tokens
- **Lucide React** for beautiful icons

### Backend
- **Express.js** server
- **Google Generative AI SDK**
- **RESTful API**

### Storage
- **LocalStorage** for how-tos (persists between sessions)
- **File system** for uploaded images

## 🎯 What Makes This Special

1. **Beautiful Design**: Premium, modern UI that feels professional
2. **Iterative Refinement**: Chat-based improvements (not just one-shot generation)
3. **Version Control**: Track every change and iteration
4. **Local-First**: Works offline, no external database needed
5. **Print-Ready**: Optimized for physical printing
6. **Easy Deployment**: Simple setup, runs locally

## 🐛 Troubleshooting

### "GEMINI_API_KEY not configured"
- Make sure you created the `.env` file
- Check that your API key is correct
- Restart the backend server after adding the key

### Port Already in Use
- Stop the process using port 3000 or 3001
- Or change the PORT in `.env`

### Images Not Generating
- Verify your Gemini API key is valid
- Check you have quota remaining (free tier has limits)
- Check the backend server logs for errors

### Vite/Node Version Issues
- The app uses Vite 5 which works with Node 18+
- If you have issues, upgrade to Node 20+

## 📈 Next Steps (Future Enhancements)

Ideas for future improvements:
- [ ] Multi-user support with authentication
- [ ] Cloud storage (Firestore)
- [ ] PDF export with multi-page support
- [ ] Collaborative editing
- [ ] Templates library
- [ ] Share how-tos via link
- [ ] Multi-language support
- [ ] Batch generation

## 🎊 You're All Set!

The app is **fully functional** and ready to use! Start creating beautiful how-to guides for your gastronomical processes.

Remember to:
1. Add your Gemini API key to `.env`
2. Experiment with different visual styles
3. Try iterative refinements
4. Print your favorites!

Enjoy! 🚀
