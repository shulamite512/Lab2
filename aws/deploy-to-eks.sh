#!/usr/bin/env bash
set -euo pipefail

# Create (or reuse) the EKS cluster and deploy all Kubernetes manifests that mirror docker-compose services.
# Requires: aws CLI configured, eksctl installed, kubectl installed.

CLUSTER_NAME="${CLUSTER_NAME:-data236-cluster}"
REGION="${REGION:-us-east-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/eksctl-cluster.yaml"
K8S_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)/k8s"

for bin in aws eksctl kubectl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing dependency: $bin" >&2
    exit 1
  fi
done

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Cluster config not found at $CONFIG_PATH" >&2
  exit 1
fi

echo "Ensuring cluster $CLUSTER_NAME exists in $REGION..."
if ! eksctl get cluster --name "$CLUSTER_NAME" --region "$REGION" >/dev/null 2>&1; then
  eksctl create cluster -f "$CONFIG_PATH"
else
  echo "Cluster already exists; skipping creation."
fi

echo "Updating kubeconfig for $CLUSTER_NAME..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"

echo "Installing/ensuring EBS CSI driver add-on..."
eksctl create addon --name aws-ebs-csi-driver --version latest --cluster "$CLUSTER_NAME" --region "$REGION" --force

echo "Applying Kubernetes manifests from $K8S_DIR (backend, frontend, ai-service + data stack)..."
kubectl apply -f "${K8S_DIR}/configmaps"
kubectl apply -f "${K8S_DIR}/secrets/app-secrets.yaml"
kubectl apply -f "${K8S_DIR}/volumes"
kubectl apply -f "${K8S_DIR}/services/mongodb-service.yaml" \
               -f "${K8S_DIR}/services/mysql-service.yaml" \
               -f "${K8S_DIR}/services/zookeeper-service.yaml" \
               -f "${K8S_DIR}/services/kafka-service.yaml" \
               -f "${K8S_DIR}/services/backend-internal-service.yaml" \
               -f "${K8S_DIR}/services/backend-service.yaml" \
               -f "${K8S_DIR}/services/frontend-service.yaml" \
               -f "${K8S_DIR}/services/ai-service-service.yaml"
kubectl apply -f "${K8S_DIR}/statefulsets/mongodb-statefulset.yaml" \
               -f "${K8S_DIR}/statefulsets/mysql-statefulset.yaml" \
               -f "${K8S_DIR}/statefulsets/zookeeper-statefulset.yaml" \
               -f "${K8S_DIR}/statefulsets/kafka-statefulset.yaml"
kubectl apply -f "${K8S_DIR}/deployments/backend-deployment.yaml" \
               -f "${K8S_DIR}/deployments/frontend-deployment.yaml" \
               -f "${K8S_DIR}/deployments/ai-service-deployment.yaml"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY_DEFAULT="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
ECR_REGISTRY="${ECR_REGISTRY:-$ECR_REGISTRY_DEFAULT}"
IMAGE_TAG="${TAG:-latest}"

if [[ "${SET_IMAGES:-true}" == "true" ]]; then
  echo "Updating deployments to use ${ECR_REGISTRY} with tag ${IMAGE_TAG}..."
  kubectl set image deployment/backend backend="${ECR_REGISTRY}/airbnb-backend:${IMAGE_TAG}"
  kubectl set image deployment/frontend frontend="${ECR_REGISTRY}/airbnb-frontend:${IMAGE_TAG}"
  kubectl set image deployment/ai-service ai-service="${ECR_REGISTRY}/airbnb-ai-service:${IMAGE_TAG}"
fi

echo "Deployment complete. Verify workloads:"
kubectl get pods
