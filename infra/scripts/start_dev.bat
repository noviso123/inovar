@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo   INOVAR GESTAO - AMBIENTE DE DESENVOLVIMENTO
echo ===================================================
echo.

:: Verificar se Go está instalado
where go >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Go nao encontrado. Por favor instale o Go.
    pause
    exit /b 1
)

:: Verificar se Node/NPM está instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] NPM nao encontrado. Por favor instale o Node.js.
    pause
    exit /b 1
)

echo [1/3] Preparando Backend (Server)...
cd server
if not exist .env (
    echo [INFO] Criando .env local para Backend...
    echo PORT=5000 > .env
    echo DATABASE_URL=file:../infra/data/inovar.db >> .env
    echo JWT_SECRET=inovar_secret_dev_key_123456 >> .env
    echo CORS_ORIGINS=http://localhost:5173 >> .env
    echo UPLOAD_DIR=../infra/data/uploads >> .env
)
cd ..

echo [2/3] Iniciando Backend em nova janela...
start "Inovar Backend" cmd /k "cd server && title Inovar Backend && go run ./cmd/api/main.go"

echo [3/3] Iniciando Frontend em nova janela...
cd client
:: Instalar dependencias se nao existirem
if not exist node_modules (
    echo [INFO] Instalando dependencias do Frontend...
    call npm install
)
start "Inovar Frontend" cmd /k "cd client && title Inovar Frontend && npm run dev"
cd ..

echo.
echo ===================================================
echo   SISTEMA INICIADO!
echo.
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo   Pressione qualquer tecla para fechar este lançador
echo   (as janelas do servidor continuarao abertas)
echo ===================================================
pause
