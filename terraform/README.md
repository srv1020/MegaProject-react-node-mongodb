# 🚀 Terraform AWS ALB & Route53 Configuration

This Terraform project creates AWS Application Load Balancers (ALBs) with Route53 DNS records for a 3-tier application.

---

## 📋 What This Creates

- **2 Application Load Balancers**:
  - Frontend ALB (for example.com, www.example.com)
  - Backend ALB (for backend.example.com)
- **2 Target Groups** pointing to EC2 instances with tag `Jenkins=k8s`
- **Route53 A Records** (alias to ALBs)
- **HTTPS listeners** with ACM certificate
- **HTTP to HTTPS redirect**

---

## 🔧 Prerequisites

1. **AWS Account** with appropriate permissions
2. **VPC** with public subnets
3. **Security Groups** allowing HTTP/HTTPS traffic
4. **ACM Certificate** for your domain (*.example.com)
5. **Route53 Hosted Zone** for your domain
6. **EC2 Instances** with tag `Jenkins=k8s` (running Kubernetes nodes)

---

## 📝 Configuration

### 1. **Update terraform.tfvars**

```bash
cp terraform.tfvars terraform.tfvars.example
vi terraform.tfvars
```

Update these values:

```hcl
# Get Route53 Zone ID
aws route53 list-hosted-zones

# Get VPC ID
aws ec2 describe-vpcs

# Get Subnet IDs
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<your-vpc-id>"

# Get Security Group IDs
aws ec2 describe-security-groups

# Get ACM Certificate ARN
aws acm list-certificates
```

---

## 🚀 Deployment

### Initialize Terraform

```bash
cd terraform
terraform init
```

### Plan Changes

```bash
terraform plan
```

### Apply Configuration

```bash
terraform apply
```

### Destroy Resources

```bash
terraform destroy
```

---

## 📊 Architecture

```
Internet
    ↓
Route53 DNS
    ├─ example.com → Frontend ALB
    ├─ www.example.com → Frontend ALB
    └─ backend.example.com → Backend ALB
         ↓
    Target Groups
         ↓
EC2 Instances (Jenkins=k8s tag)
         ↓
    Kubernetes NodePort Services
```

---

## 🔍 Verify Deployment

### Check ALB Status

```bash
aws elbv2 describe-load-balancers --names mern-3tier-frontend-alb mern-3tier-backend-alb
```

### Check Target Health

```bash
# Frontend targets
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw frontend_target_group_arn)

# Backend targets
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw backend_target_group_arn)
```

### Check Route53 Records

```bash
aws route53 list-resource-record-sets --hosted-zone-id <your-zone-id>
```

### Test Endpoints

```bash
curl https://example.com
curl https://www.example.com
curl https://backend.example.com/healthz
```

---

## 📝 Important Notes

- **Route53 Records**: If existing records exist with same name, Terraform will **replace** them (delete and recreate)
- **Target Instances**: Only instances with tag `Jenkins=k8s` and state `running` are included
- **NodePort**: Ensure Kubernetes services are exposed via NodePort matching the configured ports
- **Security Groups**: ALB security groups must allow inbound 80/443 and outbound to NodePort range
- **Health Checks**: Frontend checks `/`, Backend checks `/healthz`

---

## 🔐 Security Best Practices

- Use **HTTPS only** (HTTP redirects to HTTPS)
- Enable **deletion protection** in production (`enable_deletion_protection = true`)
- Restrict **security group** rules to necessary ports
- Use **TLS 1.3** policy for listeners
- Enable **access logs** for ALBs (add in main.tf if needed)

---

## 🛠️ Customization

### Change Target Ports

```hcl
healthcheck_target_port = 30080
backend_target_port  = 30081
```

### Add Health Check Path

```hcl
health_check_path = "/api/health"
```

### Change TTL

```hcl
ttl = 60
```

---

## 📤 Outputs

After apply, you'll see:

- Frontend ALB DNS name
- Backend ALB DNS name
- Target group ARNs
- Domain names configured
- Number of target instances

---

## 🐛 Troubleshooting

### No Instances Found

```bash
aws ec2 describe-instances --filters "Name=tag:Jenkins,Values=k8s" "Name=instance-state-name,Values=running"
```

### Unhealthy Targets

- Check security group allows ALB → NodePort
- Verify NodePort services are running
- Check health check path is accessible

### DNS Not Resolving

- Wait for DNS propagation (5-10 minutes)
- Verify Route53 hosted zone is correct
- Check nameservers at domain registrar

---

## 📚 Resources

- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
