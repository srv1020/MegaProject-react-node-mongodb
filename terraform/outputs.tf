# ========================================
# Outputs
# ========================================

output "frontend_alb_dns" {
  description = "Frontend ALB DNS name"
  value       = aws_lb.frontend.dns_name
}

output "frontend_alb_arn" {
  description = "Frontend ALB ARN"
  value       = aws_lb.frontend.arn
}

output "frontend_target_group_arn" {
  description = "Frontend target group ARN"
  value       = aws_lb_target_group.frontend.arn
}

output "backend_alb_dns" {
  description = "Backend ALB DNS name"
  value       = aws_lb.backend.dns_name
}

output "backend_alb_arn" {
  description = "Backend ALB ARN"
  value       = aws_lb.backend.arn
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_domain" {
  description = "Frontend domain name"
  value       = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
}

output "frontend_www_domain" {
  description = "Frontend www domain name"
  value       = var.create_www_record ? "www.${var.domain_name}" : "N/A"
}

output "backend_domain" {
  description = "Backend domain name"
  value       = "${var.backend_subdomain}.${var.domain_name}"
}

output "target_instance_ids" {
  description = "IDs of instances attached to target groups"
  value       = data.aws_instances.k8s_nodes.ids
}

output "target_instance_count" {
  description = "Number of target instances"
  value       = length(data.aws_instances.k8s_nodes.ids)
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID (auto-discovered)"
  value       = data.aws_route53_zone.main.zone_id
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = data.aws_route53_zone.main.name
}

output "vpc_id" {
  description = "VPC ID used for ALBs"
  value       = local.vpc_id
}

output "subnet_ids" {
  description = "Subnet IDs used for ALBs"
  value       = local.public_subnet_ids
}

output "alb_security_group_id" {
  description = "Security group ID for ALBs"
  value       = length(var.alb_security_group_ids) > 0 ? var.alb_security_group_ids[0] : aws_security_group.alb[0].id
}

output "instances_security_group_id" {
  description = "Security group ID for instances (attach to K8s nodes)"
  value       = length(var.alb_security_group_ids) == 0 ? aws_security_group.instances[0].id : "N/A - Using provided security groups"
}

output "instances_with_sg_attached" {
  description = "Instance IDs with security group attached"
  value       = length(var.alb_security_group_ids) == 0 ? data.aws_instances.k8s_nodes.ids : []
}
