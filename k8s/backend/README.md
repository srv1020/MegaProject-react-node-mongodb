# 🔧 Backend API Helm Chart

Node.js/Express backend API with MongoDB integration.

---

## 📋 Configuration

- **Image:** harshajain/backend:latest
- **Replicas:** 2
- **Port:** 3000
- **Service Type:** ClusterIP
- **Ingress:** backend.qtgem.com

---

## 🚀 Installation

### 1. **Deploy Backend (with existing MongoDB)**

```bash
helm install backend ./backend-chart -n backend --create-namespace
```

### 2. **Deploy Backend (standalone with mongo-secret)**

```bash
helm install backend ./backend-chart -n backend --create-namespace \
  --set secret.mongoSecrets.createSecret=true
```

### 3. **Verify Installation**

```bash
kubectl get deployment backend -n backend
```

```bash
kubectl get svc backend -n backend
```

```bash
kubectl get ingress backend-ingress -n backend
```

---

## 📊 Port Information

| Service | Port | Protocol | Type |
|---------|------|----------|------|
| backend | 3000 | HTTP | ClusterIP |

---

## 🌐 Access Backend

### Option 1: Via Ingress (Production)

```
https://backend.qtgem.com
```

**Health Check:**
```bash
curl https://backend.qtgem.com/healthz
```

### Option 2: Port Forward (Development)

```bash
kubectl port-forward -n backend svc/backend 3000:3000
```

Then access:
```bash
curl http://localhost:3000/healthz
```

### Option 3: From Frontend Pods

```
http://backend.backend.svc.cluster.local:3000
```

---

## 🔧 Customization

### Update Image Tag

```bash
helm upgrade backend ./backend-chart -n backend \
  --set image.tag=v2.0.0
```

### Update Replica Count

```bash
helm upgrade backend ./backend-chart -n backend \
  --set replicaCount=3
```

### Update MongoDB Connection

```bash
helm upgrade backend ./backend-chart -n backend \
  --set env.mongoHost=mongo-service.database.svc.cluster.local \
  --set env.mongoPort=27017
```

### Update CORS Origins

```bash
helm upgrade backend ./backend-chart -n backend \
  --set env.corsOrigin="https://newdomain.com,https://www.newdomain.com"
```

---

## 🔐 Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| MONGO_HOST | values.yaml | MongoDB hostname |
| MONGO_PORT | values.yaml | MongoDB port (27017) |
| MONGO_USER | mongo-secret | MongoDB username |
| MONGO_PASSWORD | mongo-secret | MongoDB password |
| MONGO_AUTH_SOURCE | mongo-secret | Auth database |
| JWT_SECRET | app-secrets | JWT signing key |
| CORS_ORIGIN | values.yaml | Allowed CORS origins |

---

## 📝 Important Notes

- **Dependencies:** Requires MongoDB (deploy database chart first)
- **Secrets:** 
  - `app-secrets`: Created by this chart (JWT)
  - `mongo-secret`: Created by database chart (or set `createSecret: true`)
- **Health Endpoint:** `/healthz`
- **NGINX Ingress:** Required for ingress to work

---

## 🔍 Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n backend -l app=backend
```

### View Logs

```bash
kubectl logs -f -n backend -l app=backend
```

### Check Environment Variables

```bash
kubectl exec -it -n backend deployment/backend -- env | grep MONGO
```

### Test Backend Locally

```bash
kubectl port-forward -n backend svc/backend 3000:3000
```

```bash
curl http://localhost:3000/healthz
```

### Check Secrets

```bash
kubectl get secret app-secrets -n backend -o yaml
```

```bash
kubectl get secret mongo-secret -n backend -o yaml
```

---

## 🗑️ Uninstall

```bash
helm uninstall backend -n backend
```
