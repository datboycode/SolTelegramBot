@echo off

set PROJECT_NAME=SolTelegramBot

echo 💻 Starting %PROJECT_NAME%...

:: Check if Node.js is installed
echo 📦 Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ⚠️ Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for npm dependencies
echo 📦 Ensuring dependencies are installed...
npm install

:: Check if .env file exists
echo 🛠️ Checking for .env file...
if not exist .env (
    echo BOT_TOKEN=your_telegram_bot_token > .env
    echo MAINNET_RPC=https://api.mainnet-beta.solana.com >> .env
    echo ✅ .env file created. Please update it with your bot token and optional RPC endpoint.
)

:: Launch the bot
echo 🚀 Launching the bot...
node bot.js

:: Pause to display errors, if any
if %ERRORLEVEL% neq 0 (
    echo ⚠️ An error occurred while running the bot. Please check your configuration and try again.
    pause
    exit /b 1
)

:: End
echo ✅ Bot is running! Send a message to your bot in Telegram to activate it.
pause
