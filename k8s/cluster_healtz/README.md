
# 🩺 Kubernetes Node Healthz DaemonSet

This lightweight app runs as a **DaemonSet** on all Kubernetes nodes and exposes a `/healthz` endpoint that always returns `HTTP 200`.  
Use it for **AWS Target Group Health Checks** to ensure each node is independently validated.

---

## ✅ Use Case (🌐 AWS Target Group Setup)

When registering EC2 **IP-based targets** to an **Application Load Balancer**, configure the health check as:

- **Target Type**: `IP`
- **Protocol**: `HTTP`
- **Port**: `30080`
- **Path**: `/healthz`
- **Expected Response**: `200 OK`
- **Purpose**: To verify node health for AWS Load Balancers (ALB/NLB) using IP targets.

---

## 📁 Project Structure

```text
.
├── Dockerfile                            # Minimal HTTP server that returns 200 OK
├── health-app-daemonset-with-np-service.yaml  # DaemonSet & NodePort Service manifest
└── README.md                             # This file
```

---
## ⚙️ Setup Instructions

### 1. 🐳 Build the Docker Image

Use Docker to build the image locally.

```bash
docker build -t <your-dockerhub-username>/node-healthz:<tag> .
```

> Replace `<your-dockerhub-username>` and `<tag>` accordingly (e.g., `v1.0`).

---

### 2. 📤 Push the Image to Docker Registry

Once built, push the image to DockerHub (or any registry of your choice).

```bash
docker push <your-dockerhub-username>/node-healthz:<tag>
```

> Example:
>
> ```bash
> docker push myuser/node-healthz:v1.0
> ```

---

### 3. 🚀 Deploy on Kubernetes as a DaemonSet

Apply the manifest file to run the container on every node and expose it via NodePort.

```bash
kubectl apply -f health-app-daemonset-with-np-service.yaml
```

> ✅ **Tip:** Use the `kube-system` namespace for system-level workloads:
>
> ```bash
> kubectl apply -n kube-system -f health-app-daemonset-with-np-service.yaml
> ```

---

## 🧠 Why Use This?

- Ensures every **K8s node** responds individually to load balancer health checks.
- Simplifies setup for **self-managed clusters** on AWS EC2 using **ALB/NLB + IP targets**.
- Works with **NGINX Ingress** or any service exposed via NodePort.

---

## 📜 License

Licensed under the Apache License, Version 2.0 (the "License")
© itdefined.org
