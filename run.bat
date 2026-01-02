@echo off
TITLE JavaCard Backend Launcher

set COMPOSE_FILE=docker-compose.yml
set NO_DB=0
set CLEAN_MODE=0

:: Parse arguments
:parse_args
if "%~1"=="" goto end_parse_args
if "%~1"=="-clean" set CLEAN_MODE=1
if "%~1"=="--no-db" (
    set COMPOSE_FILE=docker-compose.no-db.yml
    set NO_DB=1
)
shift
goto parse_args
:end_parse_args

:: Handle Clean Mode
if "%CLEAN_MODE%"=="1" (
    echo ========================================================
    echo [WARNING] Che do CLEAN dang duoc kich hoat!
    echo Dang xoa toan bo Container, Network va Volume...
    echo ========================================================
    
    :: --volumes: Xoa cac named volumes khai bao trong section 'volumes'
    :: --remove-orphans: Xoa cac container khong con duoc dinh nghia trong file compose
    docker-compose -f docker-compose.yml down --volumes --remove-orphans
    docker-compose -f docker-compose.no-db.yml down --volumes --remove-orphans
    
    echo Da xoa sach se moi du lieu!
    echo.
)

echo ========================================================
echo [INFO] Dang khoi dong he thong Backend (Docker)...
echo [INFO] Mode: %COMPOSE_FILE%
echo ========================================================

:: 1. Build va Chay Container
docker-compose -f %COMPOSE_FILE% up -d --build

:: Kiem tra xem lenh tren co loi khong
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Khong the khoi dong Docker. Hay chac chan Docker Desktop dang bat!
    pause
    exit /b
)

echo.
if "%NO_DB%"=="0" (
    echo [INFO] Dang doi Database san sang...
    timeout /t 5 /nobreak >nul
) else (
    echo [INFO] Dang doi API khoi dong...
    timeout /t 5 /nobreak >nul
)

echo.
echo [INFO] Dang chay Migration (Prisma)...
docker-compose -f %COMPOSE_FILE% exec api pnpx prisma migrate dev
:: Alternative: docker-compose exec api pnpm prisma db push

echo.
echo ========================================================
echo [SUCCESS] HE THONG DA SAN SANG!
echo --------------------------------------------------------
echo API Server:   http://localhost:8000
echo MinIO Admin:  http://localhost:9001 (admin / password123)
if "%NO_DB%"=="0" (
    echo pgAdmin:      http://localhost:5050 (admin@example.com / admin)
)
echo ========================================================
echo.

pause