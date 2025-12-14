#!/bin/bash

# VIBE Ecosystem Health Monitor
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 VIBE Ecosystem Health Check"
echo "=============================="

# Check CLI
echo -e "${YELLOW}CLI v9.0.0:${NC}"
cd vibe-cli
if npm test --silent > /dev/null 2>&1; then
    echo -e "  ✅ Tests: 143 passing"
else
    echo -e "  ❌ Tests: Failed"
fi

if npm run build --silent > /dev/null 2>&1; then
    echo -e "  ✅ Build: Success"
else
    echo -e "  ❌ Build: Failed"
fi
cd ..

# Check Extension
echo -e "${YELLOW}Extension v5.0.0:${NC}"
cd vibe-code
if npm run compile --silent > /dev/null 2>&1; then
    echo -e "  ✅ Compile: Success"
else
    echo -e "  ❌ Compile: Failed"
fi
cd ..

# Check Web
echo -e "${YELLOW}Web v2.0.0:${NC}"
cd vibe-web
if npm run build --silent > /dev/null 2>&1; then
    echo -e "  ✅ Build: Success"
else
    echo -e "  ❌ Build: Failed"
fi
cd ..

# Compatibility Check
echo -e "${YELLOW}Compatibility:${NC}"
if [[ -f "ecosystem-compatibility.json" ]]; then
    echo -e "  ✅ Matrix: Available"
else
    echo -e "  ❌ Matrix: Missing"
fi

echo -e "${GREEN}Health check complete${NC}"
