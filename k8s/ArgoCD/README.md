# 🚀 ArgoCD Setup & Configuration Guide

This guide covers installing ArgoCD, connecting to it, and configuring private Git repository access for continuous deployment.

---

## 📥 Install ArgoCD Dashboard

```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
```

### Login to ArgoCD Dashboard

```
http://<any_node_ip>:<nodeport>
```

* USERNAME: admin
* PASSWORD: `<service_token>`

## 📥 Install ArgoCD CLI

### Ubuntu/Linux

```bash
wget -q https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64 -O argocd
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

---

## 🔐 Connect to ArgoCD

### 1. **Get the NodePort Service Info**

```bash
kubectl get svc argocd-server -n argocd
```

![1769538807383](image/README/1769538807383.png)

### 2. **Get the Admin Password**

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d && echo
```

### 3. **Login to ArgoCD through ArgoCD CLI**

```bash
argocd login <ANY_NODE_IP>:<NODEPORT> --username admin --password <PASSWORD> --insecure
```

---

## 🔑 Add Private GitHub Repository

### Create GitHub Personal Access Token

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name and select scopes:
   - ✅ `repo` (full control of private repositories)
4. Click **Generate token**
5. **Copy the token** immediately (you won't see it again)

### ArgoCD CLI (Recommended)

```bash
argocd repo add https://github.com/jaintpharsha/mern_3tire.git \
  --password <github-personal-access-token> \
  --name mern_repo
```

### Verify repo added ArgoCD

```
argocd repo list
```

---

## 🚀 Deploy Applications to ArgoCD

```bash
# Backend
kubectl apply -f backend-app.yaml

# Frontend
kubectl apply -f frontend-app.yaml

# Database
kubectl apply -f database-mongo.yaml
```

---

## ✅ Verify Deployments

```bash
# List all applications
argocd app list

# Get detailed info
argocd app get backend

# Check sync status
kubectl get applications -n argocd
```

---

## 📝 Notes

- **Option 2** (Credential Template) is best for multiple repos under the same user/org
- **Option 3** (Single Repo) is best when you need different credentials per repo
- ArgoCD will automatically sync based on `syncPolicy` in Application manifests
- Use `--insecure` flag with `argocd login` if using self-signed certificates

---

## 🔐 License

This project is licensed under the Apache License 2.0.
© itdefined.org
