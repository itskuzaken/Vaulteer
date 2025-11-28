#!/bin/bash

# Hybrid API Security Setup Script
# This script helps generate secure tokens and validates configuration

echo "🔐 Hybrid API Security Setup"
echo "=============================="

# Function to generate secure token
generate_token() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32
    else
        echo "Error: openssl not found. Please install openssl or generate a 32+ character random string manually."
        exit 1
    fi
}

# Generate INTERNAL_API_TOKEN if not exists
echo ""
echo "📝 Generating INTERNAL_API_TOKEN..."
TOKEN=$(generate_token)
echo "Generated token: $TOKEN"
echo ""

echo "⚠️  IMPORTANT: Copy this token to both:"
echo "   - backend/.env as INTERNAL_API_TOKEN=$TOKEN"
echo "   - frontend/.env.production as INTERNAL_API_TOKEN=$TOKEN"
echo ""

# Check if .env files exist
echo "🔍 Checking environment configuration..."

if [ -f "backend/.env" ]; then
    echo "✓ backend/.env exists"
    if grep -q "INTERNAL_API_TOKEN" backend/.env; then
        echo "✓ INTERNAL_API_TOKEN found in backend/.env"
    else
        echo "⚠️  INTERNAL_API_TOKEN not found in backend/.env"
        echo "   Add: INTERNAL_API_TOKEN=$TOKEN"
    fi
else
    echo "❌ backend/.env not found"
    echo "   Copy backend/.env.example to backend/.env and configure"
fi

if [ -f "frontend/.env.production" ]; then
    echo "✓ frontend/.env.production exists"
    if grep -q "INTERNAL_API_TOKEN" frontend/.env.production; then
        echo "✓ INTERNAL_API_TOKEN found in frontend/.env.production"
    else
        echo "⚠️  INTERNAL_API_TOKEN not found in frontend/.env.production"
        echo "   Add: INTERNAL_API_TOKEN=$TOKEN"
    fi
else
    echo "❌ frontend/.env.production not found"
    echo "   Copy frontend/.env.example to frontend/.env.production and configure"
fi

echo ""
echo "🔒 Security Checklist:"
echo "   □ Generated strong INTERNAL_API_TOKEN (32+ chars)"
echo "   □ Token added to backend/.env"
echo "   □ Token added to frontend/.env.production"
echo "   □ .env files added to .gitignore"
echo "   □ File permissions set (chmod 600 .env files)"
echo ""

echo "🧪 Testing:"
echo "   1. Start backend: cd backend && npm start"
echo "   2. Start frontend: cd frontend && npm run build && npm start"
echo "   3. Visit: http://localhost:3000/admin/test"
echo "   4. Should show system health data"
echo ""

echo "🚀 Ready to deploy with hybrid API security!"