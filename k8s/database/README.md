# 🗄️ MongoDB Database Helm Chart

MongoDB StatefulSet deployment with persistent storage using AWS EBS.

---

## 📋 Configuration

- **Image:** mongo:6.0
- **Replicas:** 1 (StatefulSet)
- **Port:** 27017
- **Service Name:** mongo-service
- **Storage:** 4Gi (AWS EBS gp2)
- **Authentication:** Enabled

---

## 🚀 Installation

### 1. **Deploy MongoDB**

```bash
helm install mongodb ./mongo-chart -n database --create-namespace
```

### 2. **Verify Installation**

```bash
kubectl get statefulset mongo -n database
```

```bash
kubectl get svc mongo-service -n database
```

```bash
kubectl get pvc -n database
```

---

## 📊 Port Information

| Service | Port | Protocol |
|---------|------|----------|
| mongo-service | 27017 | TCP |

---

## 🔐 Access MongoDB

### Option 1: From Within the Cluster

```bash
kubectl run -it --rm mongo-client --image=mongo:6.0 --restart=Never -n database -- \
  mongosh mongodb://admin:password@mongo-service:27017/admin
```

### Option 2: Port Forward to Local Machine

```bash
kubectl port-forward -n database svc/mongo-service 27017:27017
```

Then connect locally:
```bash
mongosh mongodb://admin:password@localhost:27017/admin
```

### Option 3: From Backend Pods

Connection string from backend:
```
mongodb://admin:password@mongo-service.database.svc.cluster.local:27017/main_db?authSource=admin
```

---

## 🔧 Customization

### Update Credentials

Edit `values.yaml` and change the base64 encoded values:

```bash
# Encode new password
echo -n 'newpassword' | base64
```

### Change Storage Size

```bash
helm upgrade mongodb ./mongo-chart -n database \
  --set storage.size=10Gi
```

### Update MongoDB Version

```bash
helm upgrade mongodb ./mongo-chart -n database \
  --set image.tag=7.0
```

---

## 📝 Important Notes

- **StorageClass:** Requires `aws-ebs-csi-driver` installed
- **Credentials:** Stored in `mongo-secret` in the database namespace
- **Persistence:** Data persists across pod restarts
- **Backup:** Configure regular backups for production

---

## 🔍 Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n database
```

### View Logs

```bash
kubectl logs mongo-0 -n database
```

### Check Storage

```bash
kubectl describe pvc mongo-data-mongo-0 -n database
```

### Test Connection

```bash
kubectl exec -it mongo-0 -n database -- \
  mongosh -u admin -p password --authenticationDatabase admin
```

---

## 🗑️ Uninstall

```bash
helm uninstall mongodb -n database
```

**Note:** PVC will be retained based on `reclaimPolicy: Retain`. Delete manually if needed:

```bash
kubectl delete pvc mongo-data-mongo-0 -n database
```
