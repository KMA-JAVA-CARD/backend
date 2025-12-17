@echo off
TITLE JavaCard Backend Launcher

:: Kiem tra tham so -clean
IF "%1"=="-clean" (
    echo ========================================================
    echo [WARNING] Che do CLEAN dang duoc kich hoat!
    echo Dang xoa toan bo Container, Network va Volume...
    echo ========================================================
    
    :: --volumes: Xoa cac named volumes khai bao trong section 'volumes'
    :: --remove-orphans: Xoa cac container khong con duoc dinh nghia trong file compose
    docker-compose down --volumes --remove-orphans
    
    echo Da xoa sach se moi du lieu!
    echo.
)

echo ========================================================
echo [INFO] Dang khoi dong he thong Backend (Docker)...
echo ========================================================

:: 1. Build va Chay Container
docker-compose up -d --build

:: Kiem tra xem lenh tren co loi khong
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Khong the khoi dong Docker. Hay chac chan Docker Desktop dang bat!
    pause
    exit /b
)

echo.
echo [INFO] Dang doi Database san sang...
timeout /t 5 /nobreak >nul

echo.
echo [INFO] Dang chay Migration (Prisma)...
docker exec -it javacard_api pnpm prisma migrate dev --name init
docker exec -it javacard_api pnpx prisma migrate deploy

echo.
echo ========================================================
echo [SUCCESS] HE THONG DA SAN SANG!
echo --------------------------------------------------------
echo API Server:   http://localhost:8000
echo MinIO Admin:  http://localhost:9001 (admin / password123)
echo pgAdmin:      http://localhost:5050 (admin@example.com / admin)
echo ========================================================
echo.

pause