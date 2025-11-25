@echo off
REM Build and push Docker images for frontend, backend, and ai-service to ECR.
REM Requires: aws CLI configured, docker installed.

setlocal enabledelayedexpansion

REM Get default region from AWS config or use us-east-1
if not defined REGION (
    for /f "usebackq tokens=*" %%i in (`aws configure get region 2^>nul`) do set REGION=%%i
    if "!REGION!"=="" set REGION=us-east-1
)

REM Get AWS account ID
for /f "usebackq tokens=*" %%i in (`aws sts get-caller-identity --query Account --output text`) do set ACCOUNT_ID=%%i
if not defined ECR_REGISTRY set ECR_REGISTRY=!ACCOUNT_ID!.dkr.ecr.!REGION!.amazonaws.com
if not defined TAG set TAG=latest
if not defined PLATFORM set PLATFORM=linux/amd64
if not defined BUILDX_BUILDER set BUILDX_BUILDER=

REM Get script directory and parent directory
set SCRIPT_DIR=%~dp0
REM Remove trailing backslash - this gives us the aws directory
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Get parent directory (repo root) by going up one level from aws directory
for %%I in ("%SCRIPT_DIR%\..") do set REPO_ROOT=%%~fI

REM Check for required dependencies
echo Checking dependencies...
where aws >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing dependency: aws 1>&2
    exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing dependency: docker 1>&2
    exit /b 1
)

REM Check for docker buildx
docker buildx version >nul 2>&1
if errorlevel 1 (
    echo ERROR: docker buildx not available; install/enable Buildx (Docker Desktop has it by default). 1>&2
    exit /b 1
)

echo Using registry: !ECR_REGISTRY!
echo Using tag: !TAG!
echo Using platform: !PLATFORM!

REM Login to ECR
echo Logging in to ECR...
for /f "usebackq tokens=*" %%i in (`aws ecr get-login-password --region !REGION!`) do (
    echo %%i | docker login --username AWS --password-stdin !ECR_REGISTRY!
)

REM Define images array (name and directory)
set IMAGE_1=airbnb-backend backend
set IMAGE_2=airbnb-frontend airbnb-ui
set IMAGE_3=airbnb-ai-service ai-service

REM Process each image
for %%n in (1 2 3) do (
    set "IMAGE=!IMAGE_%%n!"
    for /f "tokens=1,2" %%a in ("!IMAGE!") do (
        set REPO=%%a
        set RELPATH=%%b
        set CONTEXT_DIR=!REPO_ROOT!\!RELPATH!

        if not exist "!CONTEXT_DIR!" (
            echo ERROR: Context not found for !REPO!: !CONTEXT_DIR! 1>&2
            exit /b 1
        )

        REM Check if ECR repository exists, create if not
        aws ecr describe-repositories --repository-names "!REPO!" --region "!REGION!" >nul 2>&1
        if errorlevel 1 (
            echo Creating ECR repository: !REPO!
            aws ecr create-repository --repository-name "!REPO!" --region "!REGION!" >nul
        )

        set IMAGE_NAME=!ECR_REGISTRY!/!REPO!:!TAG!
        echo Building and pushing !IMAGE_NAME! from !CONTEXT_DIR!...

        if not "!BUILDX_BUILDER!"=="" (
            docker buildx build --builder "!BUILDX_BUILDER!" --platform "!PLATFORM!" -t "!IMAGE_NAME!" --push "!CONTEXT_DIR!"
        ) else (
            docker buildx build --platform "!PLATFORM!" -t "!IMAGE_NAME!" --push "!CONTEXT_DIR!"
        )
    )
)

echo Done. Images pushed to !ECR_REGISTRY! with tag !TAG!.

endlocal
