import { ResumeData } from './types';

export const CLOUD_ENGINEER_PROFILE: ResumeData = {
  name: "Yemisi Babalola",
  contact: {
    location: "Little Elm, TX",
    email: "yemisiobabalola@gmail.com",
    phone: "(929)-256-8059",
    linkedin: "linkedin.com/in/oladunni-babs-b2730134a"
  },
  summary: "Senior Cloud Engineer with 5+ years of progressive experience architecting secure, scalable multi-cloud infrastructure across AWS, Azure, and GCP. Expert in Infrastructure as Code (Terraform, CloudFormation, Bicep), Kubernetes orchestration, CI/CD pipeline engineering, and cloud security governance. Proven track record delivering $150K+ in cloud cost optimization, reducing security vulnerabilities by 65%, and maintaining 99.99% infrastructure availability. AWS Solutions Architect Associate with deep expertise in landing zone design, policy-as-code, Zero Trust networking, and compliance automation (SOC 2, PCI-DSS, NIST). Seeking to drive cloud platform engineering and DevSecOps excellence.",
  skills: [
    "Cloud Platforms & Governance: AWS (EC2, S3, IAM, RDS, VPC, CloudWatch, CloudTrail, Lambda, SNS, CloudFront, Backup, Systems Manager, Secrets Manager, EKS, ECS, Organizations, Control Tower, Config, SCPs), Azure (Management Groups, Policy, Entra ID, NSGs, Monitor, Log Analytics, Key Vault, Private Endpoints), GCP (Compute Engine, Cloud Monitoring, Cloud IAM)",
    "Infrastructure as Code: Terraform, AWS CloudFormation, Bicep, ARM Templates, AWS CDK, Pulumi, Ansible",
    "Containers & Orchestration: Docker, Kubernetes (EKS, AKS), OpenShift, Helm, ArgoCD, GitOps",
    "CI/CD & Automation: Jenkins, GitLab CI, GitHub Actions, Bitbucket Pipelines, AWS CodePipeline, CodeBuild, CodeDeploy",
    "Monitoring & Observability: CloudWatch, Splunk, Grafana, Prometheus, Azure Monitor, Log Analytics, Datadog, ELK Stack, CloudTrail",
    "Security & Compliance: IAM Least-Privilege, RBAC, Zero Trust, Wiz.io, Open Policy Agent (OPA), AWS Security Hub, GuardDuty, Inspector, Macie, WAF, Shield, KMS, HashiCorp Vault, SOC 2, PCI-DSS, HIPAA, NIST 800-53, CIS Benchmarks, STIG Hardening",
    "Networking: VPC, VNet, Transit Gateway, vWAN, Security Groups, NACLs, NSGs, Subnetting, Routing, ALB, NLB, VPN, PrivateLink, Private Endpoints, Route53, CloudFront",
    "Scripting & Languages: Python (Boto3), Bash, PowerShell, Go, SQL",
    "Databases: PostgreSQL, MongoDB, MySQL, DynamoDB, Redis",
    "Collaboration & Methodologies: Agile/SCRUM, SRE, Jira, Confluence, Operational Runbooks, Architecture Decision Records"
  ],
  certifications: [
    "AWS Certified Solutions Architect – Associate",
    "AWS Certified Security – Specialty (In Progress)"
  ],
  education: [
    "University at Buffalo - Bachelor of Science in Computer Science"
  ],
  experience: [
    {
      company: "Fireserv",
      role: "Senior Cloud Engineer",
      duration: "December 2021 – Present",
      bullets: [
        "Architected multi-account AWS landing zones using AWS Organizations and Control Tower, deploying Service Control Policies (SCPs) and guardrails to enforce security baselines across 15+ production, staging, and development accounts.",
        "Engineered Infrastructure as Code using Terraform modules and CloudFormation templates to provision VPCs, Transit Gateways, subnets, route tables, and security groups, achieving 100% IaC coverage and reducing provisioning time by 80%.",
        "Implemented comprehensive cloud security posture management using AWS GuardDuty, Security Hub, Wiz.io CSPM, and AWS Config rules, automating vulnerability remediation workflows that reduced critical security findings by 65%.",
        "Designed and managed production Amazon EKS clusters with Helm chart deployments and ArgoCD GitOps workflows, implementing network policies, pod security standards, and OPA Gatekeeper admission controllers for Zero Trust container security.",
        "Built CI/CD pipelines in GitLab CI and Jenkins with integrated SAST/DAST scanning (Snyk, Checkov, OPA), container image scanning, and blue-green deployment strategies, enabling shift-left security and reducing production defects by 70%.",
        "Enforced IAM least-privilege policies, RBAC configurations, Azure Entra ID federation, and resource tagging strategies across 200+ cloud resources, maintaining continuous SOC 2, PCI-DSS, and NIST 800-53 audit readiness.",
        "Optimized cloud expenditure through AWS Compute Optimizer, Reserved Instances, Savings Plans, and automated resource scheduling, delivering $150K+ in annual cost savings while maintaining 99.99% service availability and sub-5-minute MTTR.",
        "Established centralized observability using CloudWatch, Splunk, Prometheus, Grafana, and Datadog dashboards with custom alerting and log aggregation for EKS, EC2, Lambda, and RDS workloads, reducing incident resolution time by 50%."
      ]
    },
    {
      company: "Khaime",
      role: "Cloud DevOps Engineer",
      duration: "June 2020 – November 2021",
      bullets: [
        "Automated end-to-end infrastructure provisioning using Terraform and AWS CloudFormation, deploying multi-tier VPC architectures with Application Load Balancers (ALB), Auto Scaling Groups, and RDS Multi-AZ for high availability and disaster recovery.",
        "Containerized microservices using Docker and orchestrated deployments on Amazon ECS and EKS with Helm charts and ArgoCD GitOps, improving environment parity and increasing deployment frequency from bi-weekly to daily releases.",
        "Architected CI/CD pipelines in GitLab CI, Jenkins, and GitHub Actions with automated unit testing (Pytest, Selenium), security scanning (Wiz.io, OPA, Checkov), and canary deployment strategies achieving 95% defect detection pre-production.",
        "Implemented automated secret management and credential rotation using AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault, securing database credentials and API keys across 50+ application workloads with zero credential exposure incidents.",
        "Configured AWS Systems Manager Patch Manager and Ansible playbooks for automated OS patching, CIS-hardened baselines, and STIG compliance across Linux and Windows fleets, maintaining 98% patch compliance with zero production downtime.",
        "Built CloudWatch dashboards, centralized log aggregation, and custom metric alarms using CloudTrail, VPC Flow Logs, and AWS Config for proactive monitoring of EC2, Lambda, and Kubernetes workloads, enabling sub-5-minute incident detection.",
        "Developed AWS Lambda functions with Python (Boto3) for cost anomaly detection, automated remediation of non-compliant resources, and drift detection, preventing $5,000/month in unauthorized cloud spend and policy violations.",
        "Authored operational runbooks, disaster recovery playbooks, architecture decision records (ADRs), and SOPs, reducing new engineer onboarding time by 4 weeks and standardizing incident response procedures across cross-functional teams."
      ]
    },
    {
      company: "Khaime",
      role: "Cloud Infrastructure Engineer (Intern)",
      duration: "August 2019 – May 2020",
      bullets: [
        "Provisioned and managed AWS foundational resources including EC2, S3, RDS, DynamoDB, and VPC components using CloudFormation and AWS CDK, supporting 20+ client environments with consistent configuration and encryption standards.",
        "Monitored system health, network integrity, and cloud resource utilization using CloudWatch, Prometheus, Grafana, and SNMP-based monitoring tools to proactively identify hardware failures and performance bottlenecks.",
        "Administered Linux (Ubuntu, RHEL) and Windows Server environments, performing kernel tuning, security hardening, and STIG compliance per CIS Benchmarks to reduce attack surface and ensure regulatory alignment.",
        "Resolved complex network connectivity issues involving TCP/IP, DNS, DHCP, VPN, and BGP configurations in multi-region enterprise environments, maintaining 99.9% network uptime and sub-15-minute resolution times.",
        "Automated routine system maintenance, backup verification, and log rotation using Bash, Python (Boto3), and PowerShell scripts, increasing operational efficiency by 30% and eliminating manual configuration errors.",
        "Managed deployment of security patches, software updates, and antivirus definitions across 500+ workstations and cloud instances using centralized management tools, ensuring vulnerability remediation within 24-hour SLA.",
        "Documented standard operating procedures (SOPs), change management records, and incident response workflows for system recovery, compliance audits, and knowledge transfer to distributed operations teams.",
        "Provided 24/7 on-call support for critical cloud infrastructure, performing root cause analysis (RCA) for outages, implementing CloudWatch Alarms and preventive monitoring, and reducing recurring incidents by 40%."
      ]
    },
    {
      company: "TECHNICAL PROJECT",
      role: "Multi-Cloud Landing Zone & Governance Framework",
      duration: "Terraform, Bicep, Azure Policy, AWS Organizations",
      bullets: [
        "Designed a hybrid cloud governance framework using AWS Organizations with SCPs and Azure Management Groups, deploying Terraform modules for AWS account baselines and Bicep templates for Azure subscription guardrails.",
        "Implemented Azure Policy initiatives for mandatory resource tagging, encryption-at-rest, NSG flow logging, and public exposure prevention, configuring Azure Entra ID RBAC for least-privilege access control.",
        "Established centralized logging and audit trails by integrating CloudTrail, Azure Activity Logs, and NSG Flow Logs into Azure Monitor Log Analytics and Splunk for cross-platform security visibility."
      ]
    },
    {
      company: "TECHNICAL PROJECT",
      role: "Kubernetes GitOps & DevSecOps Pipeline",
      duration: "GitHub Actions, Helm, ArgoCD, OPA, Falco",
      bullets: [
        "Built a GitOps workflow using GitHub Actions to automate Docker image builds, vulnerability scanning with Trivy, and Helm chart deployments to EKS clusters with ArgoCD sync policies.",
        "Implemented Open Policy Agent (OPA) Gatekeeper admission controller policies and Falco runtime threat detection to validate pod security standards and block non-compliant deployments before cluster admission."
      ]
    }
  ]
};

export const SOFTWARE_ENGINEER_PROFILE: ResumeData = {
  ...CLOUD_ENGINEER_PROFILE,
  summary: "Senior DevOps and Software Engineer with 5+ years of experience specializing in reliable, automated software delivery, Kubernetes orchestration, and modern cloud platforms. Expert in containerization, GitOps methodologies (ArgoCD, Helm), and CI/CD automation across GitLab CI and GitHub Actions. Strong background in Infrastructure as Code with Terraform and Ansible, database reliability, and automated system scripting using Python and Go. Proven track record driving DevOps maturity, SRE principles, and high-performance multi-cloud architecture.",
  skills: [
    "Programming & Scripting: Python (Boto3), Bash, Go, PowerShell, SQL",
    "CI/CD & DevSecOps: GitHub Actions, GitLab CI, Jenkins, ArgoCD, Helm, Docker, GitOps, Snyk, Checkov",
    "Containers & Orchestration: Kubernetes (EKS, AKS), OpenShift, Docker, Docker Compose, Kubernetes Controllers",
    "Infrastructure as Code: Terraform, AWS CloudFormation, Bicep, ARM Templates, Ansible, Pulumi",
    "Cloud Platforms: AWS (EC2, VPC, EKS, RDS, S3, IAM, Lambda, Route53, ECS), Azure (AKS, VNets, Monitor), GCP",
    "Monitoring & Observability: Prometheus, Grafana, Splunk, Datadog, ELK Stack, Azure Monitor, CloudWatch",
    "Databases & Caching: PostgreSQL, MongoDB, MySQL, DynamoDB, Redis",
    "Networking & Connectivity: VPC Peering, Transit Gateway, PrivateLink, Private Endpoints, ALB, NLB, DNS",
    "Security & Governance: IAM Least-Privilege, RBAC, WAF, KMS, HashiCorp Vault, SOC 2, PCI-DSS, STIG Hardening",
    "Collaboration & Tools: Agile/Scrum, Jira, Confluence, ADRs, SRE Runbooks"
  ]
};

export const BASE_PROFILES = {
  CLOUD_ENGINEER: CLOUD_ENGINEER_PROFILE,
  SOFTWARE_ENGINEER: SOFTWARE_ENGINEER_PROFILE
};

export const BASE_RESUME = CLOUD_ENGINEER_PROFILE;

/**
 * Build Signature & Intellectual Property Metadata
 */
export const BUILD_OWNERSHIP_METADATA = {
  copyright: "© 2026 Otemade Balogun Adedamola. All rights reserved.",
  owner: "Otemade Balogun Adedamola",
  platform: "Role Architect",
  rights: "The platform, including its source code, features, design, content, branding, and related intellectual property, may not be copied, reproduced, modified, distributed, or commercially used without prior written permission.",
  contacts: [
    "info@elitejobs.africa",
    "elitejobcvs@gmail.com"
  ]
} as const;

