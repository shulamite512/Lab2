# Kubernetes Secrets

## Creating Secrets

### Method 1: Using kubectl (Recommended for Production)

```bash
# Create session secret
kubectl create secret generic app-secrets \
  --from-literal=SESSION_SECRET=your-actual-secret-key \
  --from-literal=OPENAI_API_KEY=your-actual-openai-key

# Verify
kubectl get secrets
kubectl describe secret app-secrets
```

### Method 2: Using YAML Files (Development Only)

The `app-secrets.yaml` file contains base64-encoded secrets.

**⚠️ SECURITY WARNING:** Never commit real secrets to Git!

To encode secrets:
```bash
# Linux/Mac
echo -n "your-secret" | base64

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("your-secret"))
```

To decode secrets:
```bash
# Linux/Mac
echo "base64string" | base64 -d

# Windows PowerShell
[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("base64string"))
```

### Method 3: Using .env File

```bash
# Create secret from .env file
kubectl create secret generic app-secrets --from-env-file=.env
```

## Production Best Practices

1. **Use External Secret Management:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

2. **Use Sealed Secrets:**
   - Encrypt secrets before committing to Git
   - Install Sealed Secrets controller in cluster

3. **Enable RBAC:**
   - Restrict access to secrets
   - Use service accounts with minimal permissions

4. **Rotate Secrets Regularly:**
   - Implement secret rotation policies
   - Update secrets without downtime

## Current Secrets

- `SESSION_SECRET`: Session encryption key for Express.js
- `OPENAI_API_KEY`: OpenAI API key for AI Agent service

## Viewing Secrets

```bash
# List all secrets
kubectl get secrets

# View secret details (without values)
kubectl describe secret app-secrets

# View secret values (base64 encoded)
kubectl get secret app-secrets -o yaml

# Decode secret value
kubectl get secret app-secrets -o jsonpath='{.data.SESSION_SECRET}' | base64 -d
```
