#!/bin/bash

# How-To Generator - Full Flow Test Script
# This script tests the complete workflow from prompt to image generation

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001/api/generate"
HEALTH_URL="http://localhost:3001/api/health"
FRONTEND_URL="http://localhost:3000"

# Get prompt from argument or use default
PROMPT="${1:-How to make a cappuccino}"

echo -e "${MAGENTA}"
echo "════════════════════════════════════════"
echo "  How-To Generator - Full Flow Test"
echo "════════════════════════════════════════"
echo -e "${NC}\n"

# Check if servers are running
echo -e "${BLUE}🔍 Checking if servers are running...${NC}"

if curl -s "$HEALTH_URL" > /dev/null; then
    HEALTH=$(curl -s "$HEALTH_URL")
    echo -e "${GREEN}✓ Backend server is running${NC}"
    echo "$HEALTH" | grep -q '"geminiConfigured":true' && echo -e "${BLUE}  Gemini API: ✓ Configured${NC}" || echo -e "${RED}  Gemini API: ✗ Not configured${NC}"
else
    echo -e "${RED}✗ Backend server is not running${NC}"
    echo -e "${YELLOW}Please start it with: npm run server${NC}"
    exit 1
fi

if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend server may not be running (optional for this test)${NC}"
fi

echo ""

# Test the API
echo -e "${CYAN}🚀 Testing: \"${PROMPT}\"${NC}"
echo -e "${BLUE}📤 Sending request to API...${NC}"

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$PROMPT\", \"basePrompt\": \"minimalistic, clean design, professional\", \"format\": \"A4\"}")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ API Error:${NC}"
    echo "$RESPONSE" | grep -o '"error":"[^"]*"' | sed 's/"error":"//' | sed 's/"$//'
    echo "$RESPONSE" | grep -o '"details":"[^"]*"' | sed 's/"details":"/   Details: /' | sed 's/"$//'
    exit 1
fi

# Extract data from response
TITLE=$(echo "$RESPONSE" | grep -o '"title":"[^"]*"' | sed 's/"title":"//' | sed 's/"$//')
IMAGE_URL=$(echo "$RESPONSE" | grep -o '"imageUrl":"[^"]*"' | sed 's/"imageUrl":"//' | sed 's/"$//')
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,}]*' | sed 's/"success"://')

echo -e "${GREEN}✅ Response received in ${DURATION}s${NC}"
echo -e "${BLUE}📋 Title: \"${TITLE}\"${NC}"
echo -e "${BLUE}🖼️  Image URL: ${IMAGE_URL}${NC}"

# Verify the SVG file was created
if [ ! -z "$IMAGE_URL" ]; then
    SVG_PATH=".${IMAGE_URL}"
    if [ -f "$SVG_PATH" ]; then
        FILE_SIZE=$(du -h "$SVG_PATH" | cut -f1)
        echo -e "${GREEN}✓ SVG file created: ${FILE_SIZE}${NC}"
        
        # Get preview of content
        echo -e "${MAGENTA}📝 Generated content preview:${NC}"
        echo "$RESPONSE" | grep -o '"content":"[^"]*"' | sed 's/"content":"//' | sed 's/\\n/\n/g' | head -n 5 | while IFS= read -r line; do
            if [ ! -z "$line" ]; then
                echo -e "${YELLOW}   ${line:0:70}${NC}"
            fi
        done
        
        echo ""
        echo -e "${CYAN}🌐 View in browser: ${FRONTEND_URL}${NC}"
        echo -e "${CYAN}🖼️  Direct SVG: http://localhost:3001${IMAGE_URL}${NC}"
        echo ""
        echo -e "${MAGENTA}════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Test PASSED!${NC}\n"
        
        echo "Next steps:"
        echo -e "${CYAN}1. Open browser to: ${FRONTEND_URL}${NC}"
        echo -e "${CYAN}2. Click 'New How-To'${NC}"
        echo -e "${CYAN}3. Enter a prompt and click Send${NC}"
        echo -e "${CYAN}4. See your generated how-to appear!${NC}"
        echo ""
        
        # Offer to open in browser
        echo -e "${YELLOW}Want to open the SVG in your browser? (y/n)${NC}"
        read -t 5 -n 1 OPEN_BROWSER
        if [ "$OPEN_BROWSER" = "y" ]; then
            open "http://localhost:3001${IMAGE_URL}"
            echo -e "${GREEN}✓ Opened in browser${NC}"
        fi
        
        exit 0
    else
        echo -e "${RED}❌ SVG file not found at: ${SVG_PATH}${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No image URL in response${NC}"
    exit 1
fi
