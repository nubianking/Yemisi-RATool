import { TailoredResume } from '../types';

export type GapCategory =
  | 'Cloud & Platforms'
  | 'Security & Compliance'
  | 'IaC & Automation'
  | 'Containers & Orchestration'
  | 'Observability & SRE'
  | 'Networking & Identity'
  | 'Languages & Data'
  | 'Domain Keywords';

export type GapPriority = 'Critical' | 'Recommended';
export type GapStatus = 'Missing' | 'Under-represented' | 'Covered';

export interface LocalGapItem {
  id: string;
  term: string;
  category: GapCategory;
  priority: GapPriority;
  status: GapStatus;
  jdMentions: number;
  foundIn: ('Summary' | 'Skills' | 'Experience' | 'Certifications')[];
  suggestedPlacement: 'Summary & Experience' | 'Skills & Experience' | 'Experience Bullets' | 'Certifications & Skills';
  reason: string;
}

export interface LocalGapReport {
  totalJdTerms: number;
  coveredCount: number;
  underrepresentedCount: number;
  missingCount: number;
  missingCriticalCount: number;
  coveragePct: number;
  items: LocalGapItem[];
  categories: GapCategory[];
}

interface TaxonomyEntry {
  term: string;
  category: GapCategory;
  aliases: string[];
  placement?: LocalGapItem['suggestedPlacement'];
}

const TAXONOMY: readonly TaxonomyEntry[] = [
  // Cloud & Platforms
  { term: 'AWS', category: 'Cloud & Platforms', aliases: ['aws', 'amazon web services'] },
  { term: 'Azure', category: 'Cloud & Platforms', aliases: ['azure', 'microsoft azure'] },
  { term: 'GCP', category: 'Cloud & Platforms', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { term: 'Multi-Cloud', category: 'Cloud & Platforms', aliases: ['multi-cloud', 'multicloud', 'hybrid cloud'] },
  { term: 'AWS Organizations', category: 'Cloud & Platforms', aliases: ['aws organizations', 'service control policies', 'scps'] },
  { term: 'AWS Control Tower', category: 'Cloud & Platforms', aliases: ['control tower', 'landing zone', 'landing zones'] },
  { term: 'EC2', category: 'Cloud & Platforms', aliases: ['ec2', 'amazon ec2'] },
  { term: 'S3', category: 'Cloud & Platforms', aliases: ['s3', 'amazon s3'] },
  { term: 'AWS Lambda', category: 'Cloud & Platforms', aliases: ['lambda', 'aws lambda', 'serverless'] },
  { term: 'RDS', category: 'Cloud & Platforms', aliases: ['rds', 'amazon rds', 'aurora'] },
  { term: 'CloudFront', category: 'Cloud & Platforms', aliases: ['cloudfront'] },
  { term: 'Route 53', category: 'Cloud & Platforms', aliases: ['route53', 'route 53'] },
  { term: 'AWS Systems Manager', category: 'Cloud & Platforms', aliases: ['systems manager', 'ssm', 'patch manager'] },
  { term: 'Azure Management Groups', category: 'Cloud & Platforms', aliases: ['management groups'] },
  { term: 'Azure Policy', category: 'Cloud & Platforms', aliases: ['azure policy'] },
  { term: 'Azure Functions', category: 'Cloud & Platforms', aliases: ['azure functions'] },
  { term: 'FinOps / Cost Optimization', category: 'Cloud & Platforms', aliases: ['finops', 'cost optimization', 'cloud cost', 'savings plans', 'reserved instances'] },
  { term: 'Disaster Recovery', category: 'Cloud & Platforms', aliases: ['disaster recovery', 'rpo', 'rto', 'business continuity', 'failover'] },

  // Security & Compliance
  { term: 'Zero Trust', category: 'Security & Compliance', aliases: ['zero trust', 'zero-trust', 'ztna'] },
  { term: 'CSPM', category: 'Security & Compliance', aliases: ['cspm', 'cloud security posture'] },
  { term: 'CWPP', category: 'Security & Compliance', aliases: ['cwpp', 'workload protection'] },
  { term: 'CNAPP', category: 'Security & Compliance', aliases: ['cnapp'] },
  { term: 'Wiz', category: 'Security & Compliance', aliases: ['wiz', 'wiz.io'] },
  { term: 'Prisma Cloud', category: 'Security & Compliance', aliases: ['prisma cloud', 'palo alto prisma'] },
  { term: 'Lacework', category: 'Security & Compliance', aliases: ['lacework'] },
  { term: 'CrowdStrike', category: 'Security & Compliance', aliases: ['crowdstrike', 'falcon'] },
  { term: 'AWS GuardDuty', category: 'Security & Compliance', aliases: ['guardduty'] },
  { term: 'AWS Security Hub', category: 'Security & Compliance', aliases: ['security hub'] },
  { term: 'AWS Inspector', category: 'Security & Compliance', aliases: ['aws inspector', 'amazon inspector'] },
  { term: 'AWS Macie', category: 'Security & Compliance', aliases: ['macie'] },
  { term: 'AWS Config', category: 'Security & Compliance', aliases: ['aws config'] },
  { term: 'AWS WAF', category: 'Security & Compliance', aliases: ['waf', 'aws waf', 'web application firewall'] },
  { term: 'AWS Shield', category: 'Security & Compliance', aliases: ['aws shield', 'ddos'] },
  { term: 'Microsoft Defender for Cloud', category: 'Security & Compliance', aliases: ['defender for cloud', 'azure defender'] },
  { term: 'Microsoft Sentinel', category: 'Security & Compliance', aliases: ['sentinel', 'microsoft sentinel', 'azure sentinel'] },
  { term: 'KMS / Encryption', category: 'Security & Compliance', aliases: ['kms', 'aws kms', 'encryption at rest', 'encryption in transit', 'tls', 'mtls'] },
  { term: 'HashiCorp Vault', category: 'Security & Compliance', aliases: ['hashicorp vault', 'vault'] },
  { term: 'Secrets Manager', category: 'Security & Compliance', aliases: ['secrets manager', 'azure key vault', 'key vault', 'secret management'] },
  { term: 'OPA / Policy as Code', category: 'Security & Compliance', aliases: ['opa', 'open policy agent', 'gatekeeper', 'policy as code', 'policy-as-code', 'kyverno'] },
  { term: 'SAST / DAST', category: 'Security & Compliance', aliases: ['sast', 'dast', 'static analysis', 'dynamic analysis'] },
  { term: 'Snyk', category: 'Security & Compliance', aliases: ['snyk'] },
  { term: 'Trivy', category: 'Security & Compliance', aliases: ['trivy'] },
  { term: 'Checkov', category: 'Security & Compliance', aliases: ['checkov', 'tfsec'] },
  { term: 'SonarQube', category: 'Security & Compliance', aliases: ['sonarqube', 'sonarcloud'] },
  { term: 'Falco', category: 'Security & Compliance', aliases: ['falco'] },
  { term: 'SIEM / SOAR', category: 'Security & Compliance', aliases: ['siem', 'soar'] },
  { term: 'Threat Modeling', category: 'Security & Compliance', aliases: ['threat modeling', 'threat detection', 'vulnerability management'] },
  { term: 'SOC 2', category: 'Security & Compliance', aliases: ['soc 2', 'soc2'] },
  { term: 'PCI-DSS', category: 'Security & Compliance', aliases: ['pci-dss', 'pci dss', 'pci'] },
  { term: 'HIPAA', category: 'Security & Compliance', aliases: ['hipaa'] },
  { term: 'NIST 800-53 / CSF', category: 'Security & Compliance', aliases: ['nist', 'nist 800-53', 'nist csf'] },
  { term: 'ISO 27001', category: 'Security & Compliance', aliases: ['iso 27001', 'iso27001'] },
  { term: 'CIS Benchmarks', category: 'Security & Compliance', aliases: ['cis', 'cis benchmarks', 'cis benchmark'] },
  { term: 'FedRAMP', category: 'Security & Compliance', aliases: ['fedramp'] },
  { term: 'GDPR', category: 'Security & Compliance', aliases: ['gdpr'] },
  { term: 'STIG Hardening', category: 'Security & Compliance', aliases: ['stig', 'hardening'] },
  { term: 'MITRE ATT&CK', category: 'Security & Compliance', aliases: ['mitre', 'mitre att&ck'] },

  // IaC & Automation
  { term: 'Terraform', category: 'IaC & Automation', aliases: ['terraform', 'hcl', 'terragrunt'] },
  { term: 'CloudFormation', category: 'IaC & Automation', aliases: ['cloudformation', 'cfn'] },
  { term: 'Bicep / ARM Templates', category: 'IaC & Automation', aliases: ['bicep', 'arm templates', 'arm template'] },
  { term: 'AWS CDK', category: 'IaC & Automation', aliases: ['aws cdk', 'cdk'] },
  { term: 'Pulumi', category: 'IaC & Automation', aliases: ['pulumi'] },
  { term: 'Ansible', category: 'IaC & Automation', aliases: ['ansible'] },
  { term: 'Packer', category: 'IaC & Automation', aliases: ['packer'] },
  { term: 'GitHub Actions', category: 'IaC & Automation', aliases: ['github actions'] },
  { term: 'GitLab CI', category: 'IaC & Automation', aliases: ['gitlab ci', 'gitlab ci/cd', 'gitlab'] },
  { term: 'Jenkins', category: 'IaC & Automation', aliases: ['jenkins'] },
  { term: 'Azure DevOps', category: 'IaC & Automation', aliases: ['azure devops', 'ado', 'azure pipelines'] },
  { term: 'Bitbucket Pipelines', category: 'IaC & Automation', aliases: ['bitbucket pipelines', 'bitbucket'] },
  { term: 'AWS CodePipeline', category: 'IaC & Automation', aliases: ['codepipeline', 'codebuild', 'codedeploy'] },
  { term: 'CI/CD', category: 'IaC & Automation', aliases: ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'] },
  { term: 'GitOps', category: 'IaC & Automation', aliases: ['gitops'] },
  { term: 'ArgoCD', category: 'IaC & Automation', aliases: ['argocd', 'argo cd'] },
  { term: 'FluxCD', category: 'IaC & Automation', aliases: ['flux', 'fluxcd'] },
  { term: 'Crossplane', category: 'IaC & Automation', aliases: ['crossplane'] },

  // Containers & Orchestration
  { term: 'Kubernetes', category: 'Containers & Orchestration', aliases: ['kubernetes', 'k8s'] },
  { term: 'Amazon EKS', category: 'Containers & Orchestration', aliases: ['eks', 'amazon eks'] },
  { term: 'Azure AKS', category: 'Containers & Orchestration', aliases: ['aks', 'azure aks'] },
  { term: 'Google GKE', category: 'Containers & Orchestration', aliases: ['gke', 'google kubernetes engine'] },
  { term: 'Amazon ECS / Fargate', category: 'Containers & Orchestration', aliases: ['ecs', 'fargate', 'amazon ecs'] },
  { term: 'Docker', category: 'Containers & Orchestration', aliases: ['docker', 'containers', 'containerization'] },
  { term: 'Helm', category: 'Containers & Orchestration', aliases: ['helm', 'helm charts'] },
  { term: 'OpenShift', category: 'Containers & Orchestration', aliases: ['openshift'] },
  { term: 'Istio / Service Mesh', category: 'Containers & Orchestration', aliases: ['istio', 'service mesh', 'linkerd', 'envoy'] },
  { term: 'Cilium / Network Policies', category: 'Containers & Orchestration', aliases: ['cilium', 'calico', 'network policies'] },

  // Observability & SRE
  { term: 'CloudWatch', category: 'Observability & SRE', aliases: ['cloudwatch'] },
  { term: 'CloudTrail', category: 'Observability & SRE', aliases: ['cloudtrail'] },
  { term: 'Prometheus', category: 'Observability & SRE', aliases: ['prometheus'] },
  { term: 'Grafana', category: 'Observability & SRE', aliases: ['grafana'] },
  { term: 'Datadog', category: 'Observability & SRE', aliases: ['datadog'] },
  { term: 'Splunk', category: 'Observability & SRE', aliases: ['splunk'] },
  { term: 'ELK / OpenSearch', category: 'Observability & SRE', aliases: ['elk', 'elasticsearch', 'opensearch', 'kibana', 'logstash'] },
  { term: 'OpenTelemetry', category: 'Observability & SRE', aliases: ['opentelemetry', 'otel'] },
  { term: 'Dynatrace', category: 'Observability & SRE', aliases: ['dynatrace'] },
  { term: 'New Relic', category: 'Observability & SRE', aliases: ['new relic'] },
  { term: 'PagerDuty', category: 'Observability & SRE', aliases: ['pagerduty', 'opsgenie'] },
  { term: 'Azure Monitor / Log Analytics', category: 'Observability & SRE', aliases: ['azure monitor', 'log analytics'] },
  { term: 'SLOs / SLIs / Error Budgets', category: 'Observability & SRE', aliases: ['slo', 'slos', 'sli', 'slis', 'sla', 'error budget', 'error budgets'] },
  { term: 'Incident Response / RCA', category: 'Observability & SRE', aliases: ['incident response', 'root cause analysis', 'rca', 'post-mortem', 'postmortem', 'mttr'] },
  { term: 'Chaos Engineering', category: 'Observability & SRE', aliases: ['chaos engineering', 'gremlin', 'litmus'] },

  // Networking & Identity
  { term: 'IAM / Least Privilege', category: 'Networking & Identity', aliases: ['iam', 'least privilege', 'least-privilege'] },
  { term: 'RBAC / ABAC', category: 'Networking & Identity', aliases: ['rbac', 'abac'] },
  { term: 'Microsoft Entra ID / Azure AD', category: 'Networking & Identity', aliases: ['entra id', 'azure ad', 'active directory'] },
  { term: 'Okta', category: 'Networking & Identity', aliases: ['okta'] },
  { term: 'SSO / SAML / OIDC', category: 'Networking & Identity', aliases: ['sso', 'saml', 'oidc', 'oauth', 'oauth2', 'federation'] },
  { term: 'PAM / PIM', category: 'Networking & Identity', aliases: ['pam', 'pim', 'privileged access', 'cyberark', 'sailpoint'] },
  { term: 'VPC / VNet', category: 'Networking & Identity', aliases: ['vpc', 'vnet', 'subnetting'] },
  { term: 'Transit Gateway / vWAN', category: 'Networking & Identity', aliases: ['transit gateway', 'tgw', 'vwan', 'virtual wan'] },
  { term: 'PrivateLink / Private Endpoints', category: 'Networking & Identity', aliases: ['privatelink', 'private endpoints', 'private endpoint'] },
  { term: 'ExpressRoute / Direct Connect', category: 'Networking & Identity', aliases: ['expressroute', 'direct connect'] },
  { term: 'Load Balancing (ALB/NLB)', category: 'Networking & Identity', aliases: ['alb', 'nlb', 'load balancer', 'load balancing', 'nginx', 'haproxy'] },
  { term: 'DNS / BGP / VPN', category: 'Networking & Identity', aliases: ['dns', 'bgp', 'vpn', 'tcp/ip', 'firewalls'] },

  // Languages & Data
  { term: 'Python', category: 'Languages & Data', aliases: ['python', 'boto3', 'pytest'] },
  { term: 'Go (Golang)', category: 'Languages & Data', aliases: ['golang', 'go'] },
  { term: 'Bash / Shell Scripting', category: 'Languages & Data', aliases: ['bash', 'shell scripting', 'shell'] },
  { term: 'PowerShell', category: 'Languages & Data', aliases: ['powershell'] },
  { term: 'TypeScript / JavaScript', category: 'Languages & Data', aliases: ['typescript', 'javascript', 'node.js', 'nodejs'] },
  { term: 'Java', category: 'Languages & Data', aliases: ['java', 'spring boot'] },
  { term: 'SQL', category: 'Languages & Data', aliases: ['sql'] },
  { term: 'PostgreSQL', category: 'Languages & Data', aliases: ['postgresql', 'postgres'] },
  { term: 'MySQL', category: 'Languages & Data', aliases: ['mysql'] },
  { term: 'DynamoDB', category: 'Languages & Data', aliases: ['dynamodb'] },
  { term: 'MongoDB', category: 'Languages & Data', aliases: ['mongodb'] },
  { term: 'Redis', category: 'Languages & Data', aliases: ['redis'] },
  { term: 'Kafka', category: 'Languages & Data', aliases: ['kafka'] },
  { term: 'Snowflake', category: 'Languages & Data', aliases: ['snowflake'] },
  { term: 'Linux Administration', category: 'Languages & Data', aliases: ['linux', 'rhel', 'ubuntu', 'centos'] },

  // Certifications (Domain Keywords)
  { term: 'AWS Solutions Architect', category: 'Domain Keywords', aliases: ['aws certified solutions architect', 'solutions architect'], placement: 'Certifications & Skills' },
  { term: 'AWS Security Specialty', category: 'Domain Keywords', aliases: ['aws certified security', 'security specialty'], placement: 'Certifications & Skills' },
  { term: 'CKA / CKS', category: 'Domain Keywords', aliases: ['cka', 'cks', 'ckad'], placement: 'Certifications & Skills' },
  { term: 'CISSP', category: 'Domain Keywords', aliases: ['cissp'], placement: 'Certifications & Skills' },
  { term: 'CCSP', category: 'Domain Keywords', aliases: ['ccsp'], placement: 'Certifications & Skills' },
  { term: 'AZ-500 / AZ-305 / AZ-104', category: 'Domain Keywords', aliases: ['az-500', 'az-305', 'az-104'], placement: 'Certifications & Skills' },
  { term: 'Agile / Scrum', category: 'Domain Keywords', aliases: ['agile', 'scrum', 'jira', 'confluence'] },
  { term: 'Architecture Decision Records (ADRs)', category: 'Domain Keywords', aliases: ['adr', 'adrs', 'architecture decision records', 'runbooks'] },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTermRegex(alias: string): RegExp {
  const escaped = escapeRegex(alias);
  // Special handling for short or punctuation-heavy aliases like "go", "c++", "ci/cd", "s3"
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'gi');
}

function countAliasMatches(text: string, aliases: string[]): number {
  let count = 0;
  for (const alias of aliases) {
    // Avoid false positives on standalone English word "go" unless paired with coding context
    if (alias === 'go') {
      const goCodeRegex = /\b(?:go\s*\(golang\)|golang|python[\s,/]+go|go[\s,/]+python|go[\s,/]+bash|written\s+in\s+go|languages?[^.\n]{0,40}\bgo\b)/gi;
      const matches = text.match(goCodeRegex);
      if (matches) count += matches.length;
      continue;
    }
    const regex = buildTermRegex(alias);
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function extractRequiredSectionText(jd: string): string {
  const lower = jd.toLowerCase();
  const markers = [
    'required qualifications',
    'requirements',
    'must have',
    'must-have',
    'what you bring',
    'minimum qualifications',
    'key responsibilities',
    'core responsibilities',
  ];
  const preferredMarkers = [
    'nice to have',
    'nice-to-have',
    'preferred qualifications',
    'bonus',
    'desired',
    'plus if you',
  ];

  let startIdx = -1;
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
      startIdx = idx;
    }
  }

  if (startIdx === -1) return jd;

  let endIdx = jd.length;
  for (const marker of preferredMarkers) {
    const idx = lower.indexOf(marker, startIdx);
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }

  return jd.slice(startIdx, endIdx);
}

export function analyzeResumeGaps(
  jobDescription: string,
  tailoredResume: TailoredResume
): LocalGapReport {
  const cleanJd = (jobDescription || '').trim();
  if (!cleanJd) {
    return {
      totalJdTerms: 0,
      coveredCount: 0,
      underrepresentedCount: 0,
      missingCount: 0,
      missingCriticalCount: 0,
      coveragePct: 100,
      items: [],
      categories: [],
    };
  }

  const requiredText = extractRequiredSectionText(cleanJd);
  const summaryText = tailoredResume.summary || '';
  const skillsText = (tailoredResume.skills || []).join('\n');
  const certText = (tailoredResume.certifications || []).join('\n');
  const expText = (tailoredResume.experience || [])
    .map((exp) => `${exp.role} ${exp.company}\n${(exp.bullets || []).join('\n')}`)
    .join('\n');

  const items: LocalGapItem[] = [];
  const seenTerms = new Set<string>();

  for (const entry of TAXONOMY) {
    const jdMentions = countAliasMatches(cleanJd, entry.aliases);
    if (jdMentions === 0) continue;

    seenTerms.add(entry.term.toLowerCase());

    const inSummary = countAliasMatches(summaryText, entry.aliases) > 0;
    const inSkills = countAliasMatches(skillsText, entry.aliases) > 0;
    const inExperience = countAliasMatches(expText, entry.aliases) > 0;
    const inCertifications = countAliasMatches(certText, entry.aliases) > 0;

    const foundIn: LocalGapItem['foundIn'] = [];
    if (inSummary) foundIn.push('Summary');
    if (inSkills) foundIn.push('Skills');
    if (inExperience) foundIn.push('Experience');
    if (inCertifications) foundIn.push('Certifications');

    const inRequiredSection = countAliasMatches(requiredText, entry.aliases) > 0;
    const priority: GapPriority = jdMentions >= 2 || inRequiredSection ? 'Critical' : 'Recommended';

    let status: GapStatus;
    let suggestedPlacement: LocalGapItem['suggestedPlacement'] =
      entry.placement ?? 'Skills & Experience';
    let reason: string;

    if (foundIn.length === 0) {
      status = 'Missing';
      suggestedPlacement =
        entry.placement ??
        (priority === 'Critical' ? 'Summary & Experience' : 'Skills & Experience');
      reason =
        jdMentions >= 2
          ? `Mentioned ${jdMentions}x in the JD but absent from your tailored resume.`
          : 'Present in the JD requirements but missing from your tailored resume.';
    } else if (!inExperience && !inCertifications && inSkills) {
      status = 'Under-represented';
      suggestedPlacement = 'Experience Bullets';
      reason =
        'Listed in Skills only — add a concrete delivery bullet under Experience to prove hands-on depth.';
    } else {
      status = 'Covered';
      suggestedPlacement = 'Experience Bullets';
      reason = `Evidenced in ${foundIn.join(', ')}.`;
    }

    items.push({
      id: entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      term: entry.term,
      category: entry.category,
      priority,
      status,
      jdMentions,
      foundIn,
      suggestedPlacement,
      reason,
    });
  }

  // Also check any keywords the AI listed in analysis.keywordsUsed that might not actually appear in experience bullets
  for (const kw of tailoredResume.analysis?.keywordsUsed || []) {
    const trimmed = kw.trim();
    if (!trimmed || trimmed.length < 2 || seenTerms.has(trimmed.toLowerCase())) continue;
    const aliases = [trimmed.toLowerCase()];
    const jdMentions = countAliasMatches(cleanJd, aliases);
    if (jdMentions === 0) continue;

    seenTerms.add(trimmed.toLowerCase());
    const inSummary = countAliasMatches(summaryText, aliases) > 0;
    const inSkills = countAliasMatches(skillsText, aliases) > 0;
    const inExperience = countAliasMatches(expText, aliases) > 0;
    const inCertifications = countAliasMatches(certText, aliases) > 0;

    const foundIn: LocalGapItem['foundIn'] = [];
    if (inSummary) foundIn.push('Summary');
    if (inSkills) foundIn.push('Skills');
    if (inExperience) foundIn.push('Experience');
    if (inCertifications) foundIn.push('Certifications');

    const status: GapStatus =
      foundIn.length === 0
        ? 'Missing'
        : !inExperience && inSkills
          ? 'Under-represented'
          : 'Covered';

    items.push({
      id: `kw-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      term: trimmed,
      category: 'Domain Keywords',
      priority: jdMentions >= 2 ? 'Critical' : 'Recommended',
      status,
      jdMentions,
      foundIn,
      suggestedPlacement: status === 'Under-represented' ? 'Experience Bullets' : 'Skills & Experience',
      reason:
        status === 'Missing'
          ? 'Referenced in the JD but not found verbatim in the tailored resume text.'
          : status === 'Under-represented'
            ? 'Listed in Skills only — strengthen by weaving into an Experience bullet.'
            : `Evidenced in ${foundIn.join(', ')}.`,
    });
  }

  // Sort: Missing Critical -> Missing Recommended -> Under-represented -> Covered
  const statusRank: Record<GapStatus, number> = {
    Missing: 0,
    'Under-represented': 1,
    Covered: 2,
  };
  const priorityRank: Record<GapPriority, number> = {
    Critical: 0,
    Recommended: 1,
  };

  items.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    if (b.jdMentions !== a.jdMentions) {
      return b.jdMentions - a.jdMentions;
    }
    return a.term.localeCompare(b.term);
  });

  const coveredCount = items.filter((i) => i.status === 'Covered').length;
  const underrepresentedCount = items.filter((i) => i.status === 'Under-represented').length;
  const missingCount = items.filter((i) => i.status === 'Missing').length;
  const missingCriticalCount = items.filter(
    (i) => i.status === 'Missing' && i.priority === 'Critical'
  ).length;
  const totalJdTerms = items.length;
  const coveragePct =
    totalJdTerms > 0
      ? Math.round(((coveredCount + underrepresentedCount * 0.5) / totalJdTerms) * 100)
      : 100;

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return {
    totalJdTerms,
    coveredCount,
    underrepresentedCount,
    missingCount,
    missingCriticalCount,
    coveragePct,
    items,
    categories,
  };
}
