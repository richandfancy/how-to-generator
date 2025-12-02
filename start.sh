#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting How-To Generator...${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your GEMINI_API_KEY${NC}"
    echo -e "${YELLOW}⚠️  Get your key at: https://aistudio.google.com/app/apikey${NC}\n"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

echo -e "${GREEN}✓ Starting backend server on port 3001...${NC}"
echo -e "${GREEN}✓ Starting frontend dev server...${NC}\n"

# Start both servers
npm run server & npm run dev
