# ========================================
# Variables
# ========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# ========================================
# Domain Configuration
# ========================================

variable "domain_name" {
  description = "Base domain name (e.g., example.com)"
  type        = string
}

variable "frontend_subdomain" {
  description = "Frontend subdomain (empty for apex domain)"
  type        = string
  default     = ""
}

variable "backend_subdomain" {
  description = "Backend subdomain"
  type        = string
  default     = "backend"
}

# ========================================
# VPC & Network Configuration
# ========================================

variable "vpc_id" {
  description = "VPC ID where ALBs will be created (leave empty to use default VPC)"
  type        = string
  default     = ""
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALBs (leave empty to use default VPC public subnets)"
  type        = list(string)
  default     = []
}

# ========================================
# ALB Configuration
# ========================================

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
}

variable "alb_security_group_ids" {
  description = "Security group IDs for ALBs (leave empty to auto-create with proper rules)"
  type        = list(string)
  default     = []
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection on ALBs"
  type        = bool
  default     = false
}

variable "idle_timeout" {
  description = "ALB idle timeout in seconds"
  type        = number
  default     = 60
}

# ========================================
# Target Group Configuration
# ========================================

variable "target_instance_tag_key" {
  description = "Tag key to filter target instances"
  type        = string
  default     = "Jenkins"
}

variable "target_instance_tag_value" {
  description = "Tag value to filter target instances"
  type        = string
  default     = "k8s"
}

variable "healthcheck_target_port" {
  description = "Port for frontend targets (NodePort)"
  type        = number
  default     = 30080
}

variable "backend_target_port" {
  description = "Port for backend targets (NodePort)"
  type        = number
  default     = 30081
}

variable "health_check_path" {
  description = "Health check path for targets"
  type        = string
  default     = "/"
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "healthy_threshold" {
  description = "Number of consecutive health checks before marking healthy"
  type        = number
  default     = 2
}

variable "unhealthy_threshold" {
  description = "Number of consecutive failed health checks before marking unhealthy"
  type        = number
  default     = 2
}

# ========================================
# Route53 Configuration
# ========================================

variable "create_www_record" {
  description = "Create www subdomain record for frontend"
  type        = bool
  default     = true
}

variable "ttl" {
  description = "DNS record TTL"
  type        = number
  default     = 300
}
