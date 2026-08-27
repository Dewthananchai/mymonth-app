@echo off
echo ========================================
echo    MyMonth - Starting All Services
echo ========================================

:: Start Server
echo [1/3] Starting Server on port 5000...
cd server
set PORT=5000
start cmd /k "node index.js"
cd ..

:: Wait for server
timeout /t 3 /nobreak >nul

:: Start ngrok
echo [2/3] Starting ngrok...
start cmd /k "ngrok http 5000"

:: Wait for ngrok
timeout /t 2 /nobreak >nul

:: Start Client
echo [3/3] Starting Client...
cd client
start cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo    All services started!
echo    Server: http://localhost:5000
echo    Client: http://localhost:5173
echo    ngrok:  https://recycler-scarf-divisibly.ngrok-free.dev
echo ========================================
pause
