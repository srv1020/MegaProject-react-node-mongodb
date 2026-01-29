# ========================================
# Data Sources
# ========================================

# Get Route53 hosted zone by domain name
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get public subnets in default VPC
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }

  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
}

# Get instances with specified tags
data "aws_instances" "k8s_nodes" {
  filter {
    name   = "tag:${var.target_instance_tag_key}"
    values = [var.target_instance_tag_value]
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

# ========================================
# Locals
# ========================================

locals {
  vpc_id                 = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id
  public_subnet_ids      = length(var.public_subnet_ids) > 0 ? var.public_subnet_ids : data.aws_subnets.public.ids
  alb_security_group_ids = length(var.alb_security_group_ids) > 0 ? var.alb_security_group_ids : [aws_security_group.alb[0].id]
}

# ========================================
# Security Groups
# ========================================

# ALB Security Group
resource "aws_security_group" "alb" {
  count       = length(var.alb_security_group_ids) == 0 ? 1 : 0
  name        = "${var.project_name}-alb-sg"
  description = "Security group for ALBs - allows HTTP/HTTPS from internet"
  vpc_id      = local.vpc_id

  # Allow HTTP from internet
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from internet
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Instance Security Group (for Ingress and health check access from ALB)
resource "aws_security_group" "instances" {
  count       = length(var.alb_security_group_ids) == 0 ? 1 : 0
  name        = "${var.project_name}-instances-sg"
  description = "Security group for K8s nodes - allows Ingress traffic and health check from ALB"
  vpc_id      = local.vpc_id

  # Allow HTTP from ALB (NGINX Ingress Controller)
  ingress {
    description     = "HTTP for NGINX Ingress from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb[0].id]
  }

  # Allow health check NodePort from ALB
  ingress {
    description     = "Health check NodePort from ALB"
    from_port       = var.healthcheck_target_port
    to_port         = var.healthcheck_target_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb[0].id]
  }

  # Allow all outbound
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-instances-sg"
  }
}
# Attach security group to K8s instances
resource "null_resource" "attach_sg_to_instances" {
  count = length(var.alb_security_group_ids) == 0 && length(data.aws_instances.k8s_nodes.ids) > 0 ? 1 : 0

  triggers = {
    instance_ids = join(",", data.aws_instances.k8s_nodes.ids)
    sg_id        = aws_security_group.instances[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      for instance_id in ${join(" ", data.aws_instances.k8s_nodes.ids)}; do
        # Get current security groups
        current_sgs=$(aws ec2 describe-instances \
          --instance-ids $instance_id \
          --region ${var.aws_region} \
          --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
          --output text)
        
        # Add new security group if not already attached
        if ! echo "$current_sgs" | grep -q "${aws_security_group.instances[0].id}"; then
          all_sgs="$current_sgs ${aws_security_group.instances[0].id}"
          aws ec2 modify-instance-attribute \
            --instance-id $instance_id \
            --region ${var.aws_region} \
            --groups $all_sgs
          echo "Attached security group to instance $instance_id"
        else
          echo "Security group already attached to instance $instance_id"
        fi
      done
    EOT
  }
}
# =====================local================
# Frontend ALB
# ========================================

resource "aws_lb" "frontend" {
  name               = "${var.project_name}-frontend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = local.alb_security_group_ids
  subnets            = local.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  idle_timeout              = var.idle_timeout

  tags = {
    Name = "${var.project_name}-frontend-alb"
  }
}

# Frontend Target Group
resource "aws_lb_target_group" "frontend" {
  name     = "${var.project_name}-frontend-tg"
  port     = 80  # NGINX Ingress Controller port
  protocol = "HTTP"
  vpc_id   = local.vpc_id

  health_check {
    enabled             = true
    path                = var.health_check_path
    port                = var.healthcheck_target_port  # Override to use NodePort 30080
    protocol            = "HTTP"
    interval            = var.health_check_interval
    timeout             = var.health_check_timeout
    healthy_threshold   = var.healthy_threshold
    unhealthy_threshold = var.unhealthy_threshold
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project_name}-frontend-tg"
  }
}

# Attach instances to frontend target group
resource "aws_lb_target_group_attachment" "frontend" {
  count            = length(data.aws_instances.k8s_nodes.ids)
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = data.aws_instances.k8s_nodes.ids[count.index]
  port             = 80  # NGINX Ingress Controller port
}

# Frontend ALB Listener - HTTP (redirect to HTTPS)
resource "aws_lb_listener" "frontend_http" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Frontend ALB Listener - HTTPS
resource "aws_lb_listener" "frontend_https" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ========================================
# Backend ALB
# ========================================

resource "aws_lb" "backend" {
  name               = "${var.project_name}-backend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = local.alb_security_group_ids
  subnets            = local.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  idle_timeout              = var.idle_timeout

  tags = {
    Name = "${var.project_name}-backend-alb"
  }
}

# Backend Target Group
resource "aws_lb_target_group" "backend" {
  name     = "${var.project_name}-backend-tg"
  port     = 80  # NGINX Ingress Controller port
  protocol = "HTTP"
  vpc_id   = local.vpc_id

  health_check {
    enabled             = true
    path                = "/healthz"
    port                = var.healthcheck_target_port  # Override to use NodePort 30080
    protocol            = "HTTP"
    interval            = var.health_check_interval
    timeout             = var.health_check_timeout
    healthy_threshold   = var.healthy_threshold
    unhealthy_threshold = var.unhealthy_threshold
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project_name}-backend-tg"
  }
}

# Attach instances to backend target group
resource "aws_lb_target_group_attachment" "backend" {
  count            = length(data.aws_instances.k8s_nodes.ids)
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = data.aws_instances.k8s_nodes.ids[count.index]
  port             = 80  # NGINX Ingress Controller port
}

# Backend ALB Listener - HTTP (redirect to HTTPS)
resource "aws_lb_listener" "backend_http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Backend ALB Listener - HTTPS
resource "aws_lb_listener" "backend_https" {
  load_balancer_arn = aws_lb.backend.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ========================================
# Route53 Records
# ========================================

# Frontend - Apex domain (example.com)
resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.frontend.dns_name
    zone_id                = aws_lb.frontend.zone_id
    evaluate_target_health = true
  }
}

# Frontend - www subdomain (www.example.com)
resource "aws_route53_record" "frontend_www" {
  count   = var.create_www_record ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.frontend.dns_name
    zone_id                = aws_lb.frontend.zone_id
    evaluate_target_health = true
  }
}

# Backend subdomain (backend.example.com)
resource "aws_route53_record" "backend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.backend_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.backend.dns_name
    zone_id                = aws_lb.backend.zone_id
    evaluate_target_health = true
  }
}
