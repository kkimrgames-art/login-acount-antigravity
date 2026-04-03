#!/bin/bash

# 🎉 مرحباً بك في Antigravity Auth Manager!
# هذا السكريبت سيساعدك على البدء بسرعة

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Antigravity Auth Manager - Setup Wizard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check npm
echo "🔍 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Run setup
echo "⚙️  Running interactive setup..."
npm run setup

if [ $? -ne 0 ]; then
    echo "❌ Setup failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Create Supabase tables:"
echo "   - Go to https://supabase.com"
echo "   - Open SQL Editor"
echo "   - Copy & paste supabase-schema.sql"
echo "   - Execute the script"
echo ""
echo "2️⃣  Test configuration:"
echo "   npm run test-config"
echo ""
echo "3️⃣  Start development server:"
echo "   npm run dev"
echo ""
echo "4️⃣  Deploy to Render:"
echo "   - Push to GitHub"
echo "   - Connect to Render"
echo "   - Add environment variables"
echo "   - Deploy!"
echo ""
echo "5️⃣  After deployment, activate bot:"
echo "   curl https://your-app.onrender.com/api/init-bot"
echo ""
echo "📚 Documentation:"
echo "   - README.md          - Main guide"
echo "   - QUICKSTART.md      - 5-minute start"
echo "   - DEPLOYMENT.md      - Deployment guide"
echo "   - SECURITY.md        - Security guide"
echo "   - TROUBLESHOOTING.md - Problem solving"
echo ""
echo "🎉 Happy coding!"
echo ""
