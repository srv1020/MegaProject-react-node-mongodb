# 📦 3-Tier Kubernetes Application Deployment

This is a **3-tier web application** composed of:

- **Frontend**: ReactJS  
- **Backend**: NodeJS (Express)  
- **Database**: MongoDB

---

## 🐳 Docker Build & Push

### Frontend
```bash
docker login
cd ./frontend
docker build -t <username>/frontend .
docker push <username>/frontend
```

### Backend
```bash
cd ./backend
docker build -t <username>/backend .
docker push <username>/backend
```

---

## ☸️ Kubernetes Deployment

### 🔧 Pre-setup

### 1. **Install NGINX Ingress Controller**
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Deploy as a Deployment
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.kind=Deployment \
  --set controller.service.type=NodePort \
  --set controller.hostPort.enabled=true

# OR deploy as a DaemonSet
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.kind=DaemonSet \
  --set controller.service.type=NodePort \
  --set controller.hostPort.enabled=true
```

### 2. **Check Ingress Resources**
```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
kubectl get ingressclass
```

### 3. **aws-ebs-csi-driver**
#### Ensure to attach EBS policy for below iam user
```bash
kubectl create secret generic aws-secret \
    --namespace kube-system \
    --from-literal "key_id=${AWS_ACCESS_KEY_ID}" \
    --from-literal "access_key=${AWS_SECRET_ACCESS_KEY}"
```
#### Install Amazon Elastic Block Store (EBS) CSI driver
```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.22" 
```

### 4. **Build & Deploy Cluster Health Check App**
```bash
cd ./k8s/cluster_healtz/
# Follow instructions in README.md
```

---

## 🚀 K8S Deployment Order

### 1. Database
```bash
cd ./k8s/database
kubectl apply -f mongo-secret.yaml
kubectl apply -f mongo-storageclass.yaml
kubectl apply -f mongo-statefulset.yaml
```

### 2. Backend
```bash
cd ./k8s/backend
kubectl apply -f app-secrets.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f backend-ingress.yaml
```

### 3. Frontend
```bash
cd ./k8s/frontend
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f frontend-ingress.yaml
```

---

## ☁️ AWS ALB Configuration

- Create an **ALB** with a target group pointing to your K8s **EC2 node instances**
- Use **HTTPS** (with ACM SSL Certificate) on port that maps to **Ingress NodePort**
- Add **Route53 A-record (alias)** pointing to the ALB

---

## 🔐 License
This project is licensed under the Apache License 2.0.
© itdefined.org
