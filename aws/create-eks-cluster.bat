@echo off
REM Create EKS cluster using the eksctl config in this repo.
REM Requires: aws CLI configured, eksctl installed.

setlocal enabledelayedexpansion

REM Get script directory
set SCRIPT_DIR=%~dp0
REM Remove trailing backslash
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

set CONFIG_PATH=%SCRIPT_DIR%\eksctl-cluster.yaml

REM Check for eksctl
where eksctl >nul 2>&1
if errorlevel 1 (
    echo ERROR: eksctl not found. Install it first: https://eksctl.io/introduction/#installation 1>&2
    exit /b 1
)

echo Creating EKS cluster with config: %CONFIG_PATH%
eksctl create cluster -f "%CONFIG_PATH%"

endlocal
