# 🎨 Frontend React App Helm Chart

React frontend application with NGINX ingress.

---

## 📋 Configuration

- **Image:** harshajain/frontend:latest
- **Replicas:** 2
- **Container Port:** 3000
- **Service Port:** 80
- **Service Type:** ClusterIP
- **Ingress:** qtgem.com, www.qtgem.com

---

## 🚀 Installation

### 1. **Deploy Frontend**

```bash
helm install frontend ./frontend-chart -n frontend --create-namespace
```

### 2. **Verify Installation**

```bash
kubectl get deployment frontend -n frontend
```

```bash
kubectl get svc frontend -n frontend
```

```bash
kubectl get ingress frontend-ingress -n frontend
```

---

## 📊 Port Information

| Service | Port | Target Port | Protocol | Type |
|---------|------|-------------|----------|------|
| frontend | 80 | 3000 | HTTP | ClusterIP |

---

## 🌐 Access Frontend

### Option 1: Via Ingress (Production)

```
https://qtgem.com
https://www.qtgem.com
```

### Option 2: Port Forward (Development)

```bash
kubectl port-forward -n frontend svc/frontend 8080:80
```

Then access:
```
http://localhost:8080
```

### Option 3: NodePort (Testing)

```bash
helm upgrade frontend ./frontend-chart -n frontend \
  --set service.type=NodePort
```

```bash
kubectl get svc frontend -n frontend
```

Access via `http://<NODE_IP>:<NODE_PORT>`

---

## 🔧 Customization

### Update Image Tag

```bash
helm upgrade frontend ./frontend-chart -n frontend \
  --set image.tag=v2.0.0
```

### Update Replica Count

```bash
helm upgrade frontend ./frontend-chart -n frontend \
  --set replicaCount=3
```

### Change Ingress Hostname

```bash
helm upgrade frontend ./frontend-chart -n frontend \
  --set ingress.hosts[0].host=newdomain.com
```

### Disable Ingress

```bash
helm upgrade frontend ./frontend-chart -n frontend \
  --set ingress.enabled=false
```

---

## 📝 Important Notes

- **NGINX Ingress:** Required for ingress to work
- **DNS:** Ensure qtgem.com points to your ingress load balancer
- **SSL/TLS:** Configure cert-manager for HTTPS
- **Backend API:** Frontend expects backend at `backend.qtgem.com`

---

## 🔍 Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n frontend -l app=frontend
```

### View Logs

```bash
kubectl logs -f -n frontend -l app=frontend
```

### Test Frontend Locally

```bash
kubectl port-forward -n frontend svc/frontend 8080:80
```

```bash
curl http://localhost:8080
```

### Check Ingress Status

```bash
kubectl describe ingress frontend-ingress -n frontend
```

### Get Ingress IP/Hostname

```bash
kubectl get ingress frontend-ingress -n frontend
```

---

## 🌐 DNS Configuration

Point your domain to the ingress controller:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Create A records:
- `qtgem.com` → LoadBalancer IP
- `www.qtgem.com` → LoadBalancer IP

---

## 🔒 SSL/TLS Setup (Optional)

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Add TLS to Ingress

Edit `values.yaml` to add:

```yaml
ingress:
  enabled: true
  tls:
    - secretName: qtgem-tls
      hosts:
        - qtgem.com
        - www.qtgem.com
```

---

## 🗑️ Uninstall

```bash
helm uninstall frontend -n frontend
```
