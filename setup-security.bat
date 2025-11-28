@echo off
REM Hybrid API Security Setup Script for Windows
REM This script helps generate secure tokens and validates configuration

echo 🔐 Hybrid API Security Setup
echo ==============================

REM Generate INTERNAL_API_TOKEN using PowerShell
echo.
echo 📝 Generating INTERNAL_API_TOKEN...

powershell -Command "Add-Type -AssemblyName System.Web; $bytes = New-Object byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes); $token = [Convert]::ToBase64String($bytes); Write-Host 'Generated token:' $token; Write-Host ''; Write-Host '⚠️  IMPORTANT: Copy this token to both:'; Write-Host '   - backend\.env as INTERNAL_API_TOKEN=' $token; Write-Host '   - frontend\.env.production as INTERNAL_API_TOKEN=' $token"

echo.
echo 🔍 Checking environment configuration...

if exist "backend\.env" (
    echo ✓ backend\.env exists
    findstr /C:"INTERNAL_API_TOKEN" backend\.env >nul
    if %errorlevel%==0 (
        echo ✓ INTERNAL_API_TOKEN found in backend\.env
    ) else (
        echo ⚠️  INTERNAL_API_TOKEN not found in backend\.env
        echo    Add: INTERNAL_API_TOKEN=your_generated_token_here
    )
) else (
    echo ❌ backend\.env not found
    echo    Copy backend\.env.example to backend\.env and configure
)

if exist "frontend\.env.production" (
    echo ✓ frontend\.env.production exists
    findstr /C:"INTERNAL_API_TOKEN" frontend\.env.production >nul
    if %errorlevel%==0 (
        echo ✓ INTERNAL_API_TOKEN found in frontend\.env.production
    ) else (
        echo ⚠️  INTERNAL_API_TOKEN not found in frontend\.env.production
        echo    Add: INTERNAL_API_TOKEN=your_generated_token_here
    )
) else (
    echo ❌ frontend\.env.production not found
    echo    Copy frontend\.env.example to frontend\.env.production and configure
)

echo.
echo 🔒 Security Checklist:
echo    □ Generated strong INTERNAL_API_TOKEN (32+ chars)
echo    □ Token added to backend\.env
echo    □ Token added to frontend\.env.production
echo    □ .env files added to .gitignore
echo    □ File permissions secured
echo.

echo 🧪 Testing:
echo    1. Start backend: cd backend ^&^& npm start
echo    2. Start frontend: cd frontend ^&^& npm run build ^&^& npm start
echo    3. Visit: http://localhost:3000/admin/test
echo    4. Should show system health data
echo.

echo 🚀 Ready to deploy with hybrid API security!
pause