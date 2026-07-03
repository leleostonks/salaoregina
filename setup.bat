@echo off
echo ========================================
echo   SalonHub - Setup Completo
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version || (echo ERRO: Instale Node.js 20+ & exit /b 1)

echo.
echo [2/4] Instalando dependencias do backend...
cd backend
call npm install
if errorlevel 1 exit /b 1

echo.
echo [3/4] Banco PostgreSQL...
echo.
echo OPCAO A - Docker (recomendado local):
echo   docker compose up -d
echo   Depois: npx prisma migrate dev --name init
echo.
echo OPCAO B - Neon (cloud gratuito):
echo   1. Crie conta em https://neon.tech
echo   2. Cole a URL em backend\.env (DATABASE_URL)
echo   3. Rode: npx prisma db push
echo.
set /p DB_READY="Banco configurado? (s/n): "
if /i "%DB_READY%"=="s" (
  call npx prisma generate
  call npx prisma db push
  call npx tsx prisma/seed.ts
)

echo.
echo [4/4] Instalando frontend Next.js...
cd ..\frontend
call npm install

echo.
echo ========================================
echo   Setup concluido!
echo ========================================
echo.
echo Para rodar:
echo   Terminal 1: cd backend  ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo   Frontend: http://localhost:3000
echo   API:      http://localhost:3001
echo   Login:    regina@salonhub.demo / senha123
echo.
pause
