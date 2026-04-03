#!/bin/bash

# Pre-deployment checklist script

echo "🔍 Pre-Deployment Checklist"
echo "============================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

check() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1"
        ((checks_failed++))
    fi
}

# Check 1: .env file exists
if [ -f .env ]; then
    check ".env file exists" 0
else
    check ".env file exists" 1
    echo -e "${YELLOW}  → Run 'npm run setup' to create it${NC}"
fi

# Check 2: node_modules exists
if [ -d node_modules ]; then
    check "Dependencies installed" 0
else
    check "Dependencies installed" 1
    echo -e "${YELLOW}  → Run 'npm install'${NC}"
fi

# Check 3: Can build successfully
echo ""
echo "Testing build..."
npm run build > /dev/null 2>&1
check "Build succeeds" $?

# Check 4: Required files exist
required_files=(
    "package.json"
    "next.config.js"
    "supabase-schema.sql"
    "pages/index.js"
    "pages/api/health.js"
)

all_files_exist=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        all_files_exist=1
        break
    fi
done
check "All required files exist" $all_files_exist

# Summary
echo ""
echo "============================"
echo -e "${GREEN}Passed: $checks_passed${NC}"
echo -e "${RED}Failed: $checks_failed${NC}"
echo "============================"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✓ Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Push to GitHub"
    echo "  2. Connect to Render"
    echo "  3. Add environment variables"
    echo "  4. Deploy!"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Please fix the issues above before deploying${NC}"
    echo ""
    exit 1
fi
