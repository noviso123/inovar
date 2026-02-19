@echo off
REM ==============================================================
REM INOVAR - Script de Inicialização (Windows)
REM Uso: scripts\start.bat
REM ==============================================================

echo.
echo   ╔══════════════════════════════════════╗
echo   ║       INOVAR - Sistema de Gestão     ║
echo   ║       Iniciando em modo Docker...    ║
echo   ╚══════════════════════════════════════╝
echo.

REM Verify Docker is running
docker info > NUL 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker Desktop nao esta rodando!
    echo Por favor inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)
echo [OK] Docker detectado

REM Create persistent data directories
if not exist "data\db" mkdir data\db
if not exist "data\uploads" mkdir data\uploads
if not exist "data\certs" mkdir data\certs
echo [OK] Pastas de dados verificadas

REM Copy .env.docker if it does not exist
if not exist ".env.docker" (
    if exist ".env.docker.example" (
        copy ".env.docker.example" ".env.docker" > NUL
        echo [AVISO] .env.docker criado a partir do exemplo.
        echo [AVISO] IMPORTANTE: Edite .env.docker e defina o JWT_SECRET!
        echo.
    ) else (
        echo [ERRO] Arquivo .env.docker.example nao encontrado!
        pause
        exit /b 1
    )
)
echo [OK] Configuracoes verificadas

REM Check if JWT_SECRET needs to be changed
findstr /C:"CHANGE_ME" ".env.docker" > NUL
if %errorlevel% equ 0 (
    echo.
    echo [AVISO] JWT_SECRET ainda e o valor padrao!
    echo [AVISO] Para producao, edite .env.docker e gere um secret com:
    echo [AVISO]   openssl rand -hex 32
    echo.
)

REM Build and start
echo.
echo Fazendo build e iniciando o sistema...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar! Verifique os logs com:
    echo   docker-compose logs -f
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Sistema iniciado com sucesso!
echo   Acesse: http://localhost:8080
echo   Login:  admin@inovar.com / 123456
echo ========================================
echo.
echo Para ver os logs: docker-compose logs -f
echo Para parar:       docker-compose down
echo.
pause
