@echo off
setlocal enabledelayedexpansion

title PersonaMotion Studio - Launch System
color 0B

echo ======================================================================
echo          PERSONAMOTION WEB STUDIO - AI VIDEO RETARGETING
echo ======================================================================
echo.

:: 1. Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version recommended) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Detected Node.js: %NODE_VERSION%

:: 2. Ensure .env exists
if not exist .env (
    echo [INFO] .env not found. Creating .env from .env.example...
    copy .env.example .env >nul
    echo [OK] Generated .env file with default configuration.
) else (
    echo [OK] Configuration file .env found.
)

:: 3. Check node_modules and install dependencies if missing
if not exist node_modules (
    echo [INFO] Installing required project dependencies (this may take a few moments)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Node modules verified.
)

:: 4. Generate Prisma Client
echo [INFO] Generating Prisma ORM Client...
call npx.cmd prisma generate
if %errorlevel% neq 0 (
    echo [WARNING] Prisma generate encountered an issue, proceeding with fallback...
)

:: 5. Open Browser after short delay and start server
echo.
echo ======================================================================
echo   Launching PersonaMotion Studio at: http://localhost:3000
echo ======================================================================
echo.

start "" "http://localhost:3000"

:: Start Next.js development server
call npm.cmd run dev

pause
