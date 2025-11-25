@echo off
REM Create (or reuse) the EKS cluster and deploy all Kubernetes manifests that mirror docker-compose services.
REM Requires: aws CLI configured, eksctl installed, kubectl installed.

setlocal enabledelayedexpansion

REM Set default environment variables
if not defined CLUSTER_NAME set CLUSTER_NAME=data236-cluster
if not defined REGION set REGION=us-east-1

REM Get script directory
set SCRIPT_DIR=%~dp0
REM Remove trailing backslash
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

set CONFIG_PATH=%SCRIPT_DIR%\eksctl-cluster.yaml

REM Get parent directory for k8s
for %%I in ("%SCRIPT_DIR%\..") do set PARENT_DIR=%%~fI
set K8S_DIR=%PARENT_DIR%\k8s

REM Check for required dependencies
echo Checking dependencies...
where aws >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing dependency: aws 1>&2
    exit /b 1
)

where eksctl >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing dependency: eksctl 1>&2
    exit /b 1
)

where kubectl >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing dependency: kubectl 1>&2
    exit /b 1
)

REM Check if config file exists
if not exist "%CONFIG_PATH%" (
    echo ERROR: Cluster config not found at %CONFIG_PATH% 1>&2
    exit /b 1
)

REM Ensure cluster exists
echo Ensuring cluster %CLUSTER_NAME% exists in %REGION%...
eksctl get cluster --name "%CLUSTER_NAME%" --region "%REGION%" >nul 2>&1
if errorlevel 1 (
    echo Creating cluster...
    eksctl create cluster -f "%CONFIG_PATH%"
) else (
    echo Cluster already exists; skipping creation.
)

REM Update kubeconfig
echo Updating kubeconfig for %CLUSTER_NAME%...
aws eks update-kubeconfig --name "%CLUSTER_NAME%" --region "%REGION%"

REM Install EBS CSI driver
echo Installing/ensuring EBS CSI driver add-on...
eksctl create addon --name aws-ebs-csi-driver --version latest --cluster "%CLUSTER_NAME%" --region "%REGION%" --force

REM Apply Kubernetes manifests
echo Applying Kubernetes manifests from %K8S_DIR% (backend, frontend, ai-service + data stack)...
kubectl apply -f "%K8S_DIR%\configmaps"
kubectl apply -f "%K8S_DIR%\secrets\app-secrets.yaml"
kubectl apply -f "%K8S_DIR%\volumes"
kubectl apply -f "%K8S_DIR%\services\mongodb-service.yaml" -f "%K8S_DIR%\services\mysql-service.yaml" -f "%K8S_DIR%\services\zookeeper-service.yaml" -f "%K8S_DIR%\services\kafka-service.yaml" -f "%K8S_DIR%\services\backend-internal-service.yaml" -f "%K8S_DIR%\services\backend-service.yaml" -f "%K8S_DIR%\services\frontend-service.yaml" -f "%K8S_DIR%\services\ai-service-service.yaml"
kubectl apply -f "%K8S_DIR%\statefulsets\mongodb-statefulset.yaml" -f "%K8S_DIR%\statefulsets\mysql-statefulset.yaml" -f "%K8S_DIR%\statefulsets\zookeeper-statefulset.yaml" -f "%K8S_DIR%\statefulsets\kafka-statefulset.yaml"
kubectl apply -f "%K8S_DIR%\deployments\backend-deployment.yaml" -f "%K8S_DIR%\deployments\frontend-deployment.yaml" -f "%K8S_DIR%\deployments\ai-service-deployment.yaml"

REM Get AWS account ID
for /f "usebackq tokens=*" %%i in (`aws sts get-caller-identity --query Account --output text`) do set ACCOUNT_ID=%%i
set ECR_REGISTRY_DEFAULT=!ACCOUNT_ID!.dkr.ecr.!REGION!.amazonaws.com
if not defined ECR_REGISTRY set ECR_REGISTRY=!ECR_REGISTRY_DEFAULT!
if not defined TAG set TAG=latest
if not defined SET_IMAGES set SET_IMAGES=true

REM Update deployment images
if "!SET_IMAGES!"=="true" (
    echo Updating deployments to use !ECR_REGISTRY! with tag !TAG!...
    kubectl set image deployment/backend backend=!ECR_REGISTRY!/airbnb-backend:!TAG!
    kubectl set image deployment/frontend frontend=!ECR_REGISTRY!/airbnb-frontend:!TAG!
    kubectl set image deployment/ai-service ai-service=!ECR_REGISTRY!/airbnb-ai-service:!TAG!
)

REM Show deployment status
echo Deployment complete. Verify workloads:
kubectl get pods

endlocal
