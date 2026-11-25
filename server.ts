import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import type { Schema } from "@google/genai";
import type {
  TargetRole,
  ResumeData,
  TailoredResume,
  UsageMetadata,
  GapAnalysisResult,
  WorkExperience,
} from "./types.ts";
import {
  ACTIVE_FREE_TIER_MODEL_IDS,
  TASK_ROUTING_POLICIES,
  estimateTokenCostUsd,
  getTaskModelChain,
  normalizeCostProfile,
} from "./costCatalog.ts";
import type { CostProfile, TaskKey } from "./costCatalog.ts";

const PORT = Number(process.env.PORT) || 3000;

// Keyed Single-Role Intelligence Maps (inject ONLY the active targetRole to eliminate ~70-75% input token bloat)
const ROLE_TAILORING_PROMPTS: Record<string, string> = {
  "Cloud Security Engineer":
    "Focus on cloud risk management, security governance, audit readiness, IAM least-privilege, WAF, Zero Trust networking, CSPM/CWPP (Wiz.io, GuardDuty, Security Hub, Defender), KMS/secrets management, and compliance frameworks (NIST 800-53, SOC 2, PCI-DSS, ISO 27001, CIS).",
  "Cloud Engineer":
    "Focus on multi-cloud reliability, scalability, FinOps cost optimization, Infrastructure as Code (Terraform, CloudFormation, Bicep), landing zones, high-availability multi-region architectures, networking, and operational automation.",
  "DevSecOps Engineer":
    "Focus on CI/CD pipeline security, shift-left security gates (SAST, DAST, SCA, IaC scanning with Checkov/Snyk/Trivy), container and Kubernetes hardening, OPA policy-as-code, supply-chain security, and automated compliance remediation.",
  "IAM Engineer":
    "Focus exclusively on identity lifecycle management, RBAC/ABAC governance, SSO, SAML/OIDC federation, Entra ID / Okta / AWS IAM Identity Center, privileged access management (PAM/PIM), conditional access, and Zero Trust identity controls. Suppress general DevOps tasks.",
  "DevOps Engineer":
    "Focus on software delivery pipelines, CI/CD automation (GitLab CI, GitHub Actions, Jenkins, ArgoCD), release reliability, Infrastructure as Code (Terraform, Ansible), container orchestration (Docker, Kubernetes, Helm), and observability. Suppress heavy security/compliance audit framing unless in the JD.",
  "AWS Cloud Engineer":
    "Deep-dive AWS native services (Organizations, Control Tower, SCPs, IAM, VPC, Transit Gateway, EKS, ECS, EC2, RDS, Lambda, KMS, Secrets Manager, CloudTrail, GuardDuty, Config, CloudWatch, CloudFormation, Terraform).",
  "Azure Cloud Engineer":
    "Deep-dive Azure enterprise stack (Management Groups, Azure Policy, Entra ID, VNets, vWAN, Private Endpoints, NSGs, AKS, Bicep, ARM Templates, Key Vault, Azure Monitor, Log Analytics, Microsoft Sentinel, Defender for Cloud).",
  "Cloud Solution Architect":
    "Focus on end-to-end solution architecture, enterprise cloud design patterns, multi-tier distributed systems, non-functional requirements (high availability, disaster recovery, RPO/RTO, scalability), landing zones, ADRs, and TCO/FinOps cost modeling.",
  "Azure Cloud Architect":
    "Deep-dive Azure Architecture Center frameworks (Cloud Adoption Framework / CAF, Well-Architected Framework / WAF), enterprise-scale landing zones, management group hierarchies, ExpressRoute/vWAN hub-and-spoke networking, and Azure Policy governance at scale.",
  "Site Reliability Engineer":
    "Focus on SLOs, SLAs, SLIs, error budgets, distributed telemetry and observability (OpenTelemetry, Prometheus, Grafana, Datadog, Splunk), incident response, blameless post-mortems, chaos engineering, capacity planning, and systematic toil reduction.",
  "Software Engineer":
    "Focus on backend and distributed systems engineering, API design, cloud-native microservices, code maintainability, automated testing paradigms (Pytest, integration tests), data structures, database reliability, Python/Go/SQL engineering, and runtime performance.",
};

const ROLE_QA_HINTS: Record<string, string> = {
  "Cloud Security Engineer":
    "Emphasize risk reduction metrics, Zero Trust architecture, CSPM remediation, IAM least-privilege, and SOC 2 / NIST / PCI-DSS audit outcomes.",
  "Cloud Engineer":
    "Emphasize multi-cloud IaC delivery (Terraform, CloudFormation, Bicep), availability SLAs (99.99%), FinOps savings ($150K+), and resilient VPC/EKS architectures.",
  "DevSecOps Engineer":
    "Emphasize shift-left CI/CD security gates (Snyk, Checkov, Trivy, OPA), container admission controls, automated secret rotation, and defect reduction.",
  "IAM Engineer":
    "Emphasize least-privilege IAM design, Entra ID / SSO federation, RBAC/ABAC governance, privileged access controls, and audit compliance.",
  "DevOps Engineer":
    "Emphasize CI/CD release velocity, GitOps (ArgoCD, Helm), Terraform/Ansible automation, Kubernetes reliability, and MTTR reduction.",
  "AWS Cloud Engineer":
    "Emphasize AWS Organizations, Control Tower, SCPs, EKS, VPC/Transit Gateway, Lambda (Python/Boto3), and AWS-native security and cost tooling.",
  "Azure Cloud Engineer":
    "Emphasize Azure Management Groups, Azure Policy, Entra ID, Bicep, AKS, Private Endpoints, Key Vault, and Azure Monitor / Log Analytics.",
  "Cloud Solution Architect":
    "Emphasize architectural trade-offs, ADRs, multi-account landing zones, high availability/DR design, and measurable business ROI.",
  "Azure Cloud Architect":
    "Emphasize CAF/WAF alignment, enterprise landing zones, hub-and-spoke vWAN networking, and policy-driven governance across subscriptions.",
  "Site Reliability Engineer":
    "Emphasize SLOs/SLIs, sub-5-minute MTTR, centralized observability (Prometheus, Grafana, Datadog, Splunk), root-cause analysis, and toil elimination.",
  "Software Engineer":
    "Emphasize Python/Go/SQL automation, containerized microservices, automated testing, API reliability, and scalable cloud-native systems.",
};

const ROLE_COVER_LETTER_HINTS: Record<string, string> = {
  "Cloud Security Engineer":
    "Lead with measurable security posture improvements (65% reduction in critical findings), Zero Trust controls, and continuous compliance readiness.",
  "Cloud Engineer":
    "Lead with resilient multi-cloud architecture, 100% IaC automation, 99.99% uptime, and $150K+ in verified FinOps cloud cost optimization.",
  "DevSecOps Engineer":
    "Lead with embedding automated security gates directly into CI/CD and GitOps pipelines to accelerate secure releases and cut production defects by 70%.",
  "IAM Engineer":
    "Lead with enterprise identity federation, least-privilege IAM governance across 200+ cloud resources, and zero-exposure credential automation.",
  "DevOps Engineer":
    "Lead with transforming release cadence from bi-weekly to daily through GitOps (ArgoCD/Helm), Terraform IaC, and automated observability.",
  "AWS Cloud Engineer":
    "Lead with multi-account AWS Organizations/Control Tower architecture, EKS operations, and automated cost and security governance on AWS.",
  "Azure Cloud Engineer":
    "Lead with Azure enterprise governance (Management Groups, Azure Policy, Entra ID), Bicep infrastructure automation, and hybrid cloud integration.",
  "Cloud Solution Architect":
    "Lead with translating business goals into resilient, cost-governed multi-cloud landing zones and well-documented architectural standards.",
  "Azure Cloud Architect":
    "Lead with CAF/WAF-aligned Azure landing zone architecture, subscription-scale policy guardrails, and secure enterprise networking.",
  "Site Reliability Engineer":
    "Lead with 99.99% service availability, sub-5-minute MTTR, unified observability stacks, and eliminating operational toil through Python/IaC automation.",
  "Software Engineer":
    "Lead with building reliable, automated cloud-native software and services using Python, Go, Kubernetes, and rigorous CI/CD engineering.",
};

interface RoleProgressionGuide {
  currentRole: string;
  midRole: string;
  internRole: string;
  projectAngle: string;
  experienceFocus: string;
}

const ROLE_PROGRESSION_GUIDES: Record<string, RoleProgressionGuide> = {
  "Cloud Security Engineer": {
    currentRole: "Cloud Security Engineer",
    midRole: "Cloud Security & DevOps Engineer",
    internRole: "Cloud Infrastructure & Security Engineer (Intern)",
    projectAngle: "Zero Trust cloud governance, CSPM/CWPP posture hardening, IAM least-privilege, OPA policy-as-code, and continuous SOC 2 / NIST 800-53 / PCI-DSS compliance",
    experienceFocus: "Reframe every role around cloud threat detection, CSPM remediation, IAM governance, KMS/secrets security, Zero Trust networking, and automated compliance guardrails.",
  },
  "Cloud Engineer": {
    currentRole: "Cloud Engineer",
    midRole: "Cloud DevOps Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Multi-cloud landing zone architecture, Terraform/Bicep IaC automation, high-availability EKS/AKS operations, and FinOps cost governance",
    experienceFocus: "Reframe every role around scalable multi-cloud infrastructure design, IaC standardization, networking, high availability, and cloud cost optimization.",
  },
  "DevSecOps Engineer": {
    currentRole: "DevSecOps Engineer",
    midRole: "Cloud DevOps & Security Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Shift-left CI/CD security gates (SAST/DAST/SCA/IaC scanning), container hardening, OPA Gatekeeper admission control, and GitOps supply-chain security",
    experienceFocus: "Reframe every role around embedding automated security gates into CI/CD pipelines, IaC compliance scanning, container/Kubernetes hardening, and secret rotation.",
  },
  "IAM Engineer": {
    currentRole: "IAM Engineer",
    midRole: "Cloud Identity & Access Engineer",
    internRole: "Cloud Infrastructure & Access Engineer (Intern)",
    projectAngle: "Enterprise IAM least-privilege architecture, Entra ID / SSO / SAML / OIDC federation, RBAC/ABAC governance, and automated secrets/PAM controls",
    experienceFocus: "Reframe every role around identity lifecycle governance, least-privilege IAM policies, federation (Entra ID, Okta, AWS IAM Identity Center), PAM/PIM, and Zero Trust access controls.",
  },
  "DevOps Engineer": {
    currentRole: "DevOps Engineer",
    midRole: "Cloud DevOps Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Automated CI/CD delivery pipelines, GitOps (ArgoCD, Helm), Terraform/Ansible IaC automation, and Kubernetes release engineering",
    experienceFocus: "Reframe every role around deployment velocity, CI/CD automation, GitOps workflows, Terraform/Ansible IaC, container orchestration, and observability.",
  },
  "AWS Cloud Engineer": {
    currentRole: "AWS Cloud Engineer",
    midRole: "AWS Cloud DevOps Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "AWS multi-account Organizations & Control Tower landing zones, Terraform/CloudFormation IaC, Amazon EKS/ECS, and AWS-native security and FinOps automation",
    experienceFocus: "Reframe every role around AWS-native architecture (Organizations, Control Tower, VPC, Transit Gateway, EKS, RDS, Lambda, KMS, CloudWatch, GuardDuty) and Python/Boto3 automation.",
  },
  "Azure Cloud Engineer": {
    currentRole: "Azure Cloud Engineer",
    midRole: "Cloud & Azure DevOps Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Azure Management Groups & Azure Policy governance, Bicep/Terraform IaC, Entra ID RBAC, Private Endpoints, AKS, and Azure Monitor / Log Analytics",
    experienceFocus: "Reframe every role around Azure enterprise infrastructure (VNets, vWAN, Private Endpoints, Bicep, AKS, Key Vault, Entra ID, Azure Monitor, Defender for Cloud) alongside hybrid AWS experience.",
  },
  "Cloud Solution Architect": {
    currentRole: "Cloud Solution Architect",
    midRole: "Cloud Infrastructure & DevOps Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Enterprise multi-cloud reference architectures, Well-Architected landing zones, HA/DR design (RPO/RTO), ADRs, and FinOps TCO modeling",
    experienceFocus: "Reframe every role around end-to-end solution design, multi-region resilience, non-functional requirements, architecture decision records (ADRs), governance guardrails, and cost modeling.",
  },
  "Azure Cloud Architect": {
    currentRole: "Azure Cloud Architect",
    midRole: "Azure & Multi-Cloud Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "Azure CAF/WAF enterprise landing zones, Management Group policy hierarchies, hub-and-spoke vWAN/ExpressRoute networking, and Bicep/Terraform governance",
    experienceFocus: "Reframe every role around Azure Cloud Adoption Framework (CAF), Well-Architected Framework (WAF), enterprise landing zones, Azure Policy at scale, and hybrid cloud integration.",
  },
  "Site Reliability Engineer": {
    currentRole: "Site Reliability Engineer",
    midRole: "Cloud DevOps & Reliability Engineer",
    internRole: "Cloud Infrastructure Engineer (Intern)",
    projectAngle: "High-availability cloud platforms, SLO/SLI/error-budget observability (Prometheus, Grafana, Datadog, Splunk), incident automation, and toil elimination",
    experienceFocus: "Reframe every role around 99.99% availability, SLOs/SLIs, sub-5-minute MTTR, distributed observability, automated remediation, chaos/DR readiness, and systematic toil reduction.",
  },
  "Software Engineer": {
    currentRole: "Cloud Software Engineer",
    midRole: "Cloud & Backend DevOps Engineer",
    internRole: "Cloud Infrastructure & Software Engineer (Intern)",
    projectAngle: "Python/Go cloud automation services, containerized microservices, automated testing (Pytest), API reliability, and Kubernetes CI/CD delivery",
    experienceFocus: "Reframe every role around backend/cloud software engineering in Python, Go, and SQL, API and microservice architecture, automated testing, database reliability, and CI/CD engineering.",
  },
};

function getRoleProgressionGuide(targetRole: string): RoleProgressionGuide {
  return (
    ROLE_PROGRESSION_GUIDES[targetRole] ?? {
      currentRole: targetRole,
      midRole: "Cloud & DevOps Engineer",
      internRole: "Cloud Infrastructure Engineer (Intern)",
      projectAngle: `Cloud engineering architecture, automation, and delivery aligned to ${targetRole}`,
      experienceFocus: `Reframe every role and project to directly demonstrate hands-on mastery of ${targetRole} while maintaining 5 years of Cloud Engineering experience.`,
    }
  );
}

function isTechnicalProjectEntry(exp: WorkExperience | undefined | null): boolean {
  if (!exp) return false;
  const company = (exp.company || "").trim();
  const role = (exp.role || "").trim();
  if (/^technical\s+(project|projects|summary)$/i.test(company)) {
    return true;
  }
  if (
    /^multi-cloud landing zone & governance framework$/i.test(role) ||
    /^kubernetes gitops & devsecops pipeline$/i.test(role)
  ) {
    return true;
  }
  return false;
}

function resolveTargetAlignedRoleTitle(
  srcExp: WorkExperience,
  index: number,
  targetRole: string
): string {
  const roleLower = (srcExp.role || "").toLowerCase();
  const guide = getRoleProgressionGuide(targetRole);

  if (roleLower.includes("intern")) {
    return guide.internRole;
  }
  if (index === 0) {
    return guide.currentRole;
  }
  return guide.midRole;
}

function getRoleIntelligence(map: Record<string, string>, targetRole: string): string {
  return (
    map[targetRole] ??
    "Focus on cloud platform engineering, Infrastructure as Code, security governance, observability, and measurable operational impact aligned directly to the Job Description."
  );
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please check Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function cleanErrorMessage(raw: unknown): { message: string; isQuota: boolean; retrySeconds?: number } {
  const errObj = raw as { message?: string } | null;
  let text = typeof raw === "string" ? raw : errObj?.message || String(raw);
  let retrySeconds: number | undefined;

  try {
    if (typeof text === "string" && text.trim().startsWith("{")) {
      const parsed = JSON.parse(text);
      if (parsed.error?.message) {
        text = parsed.error.message;
      }
      if (parsed.details) {
        for (const d of parsed.details) {
          if (d.retryDelay) {
            const num = parseInt(d.retryDelay, 10);
            if (!isNaN(num)) retrySeconds = num;
          }
        }
      }
    }
  } catch {
    // Ignore JSON parsing failure
  }

  const isQuota =
    text.includes("429") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.toLowerCase().includes("quota exceeded") ||
    text.toLowerCase().includes("free_tier_requests");

  if (isQuota) {
    const match = text.match(/retry in ([0-9.]+)s/i);
    if (match && match[1]) {
      retrySeconds = Math.ceil(parseFloat(match[1]));
    }
    const cleanMsg = retrySeconds
      ? `Gemini API rate limit reached. Please retry in ${retrySeconds} seconds, or switch routing mode in Cost & Models.`
      : "Gemini API quota limit reached. Please wait briefly for quota reset or check your API key in Settings > Secrets.";
    return { message: cleanMsg, isQuota: true, retrySeconds };
  }

  if (text.includes("503") || text.includes("high demand") || text.includes("UNAVAILABLE")) {
    return {
      message: "The AI service is experiencing high demand. Please try again in a few moments.",
      isQuota: false,
    };
  }

  return { message: text, isQuota: false };
}

function buildModelConfig(
  model: string,
  params: {
    systemInstruction?: string;
    responseSchema?: Schema;
    temperature?: number;
  }
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }
  if (params.responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = params.responseSchema;
  }

  const isGemini4 = model.startsWith("gemini-4-");
  const isFlashLite31 = model.startsWith("gemini-3.1-flash-lite");
  const isFlash38 = model.startsWith("gemini-3.8-");

  if (isGemini4) {
    // Gemini 4 rule: ThinkingLevel.LOW for cost-efficient synthesis; NEVER pass temperature/topP/topK/candidateCount
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (isFlashLite31) {
    // Gemini 3.1 Flash-Lite rule: ThinkingLevel.MINIMAL for minimal latency & cost
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
    if (typeof params.temperature === "number") {
      config.temperature = params.temperature;
    }
  } else if (isFlash38) {
    // Gemini 3.8 Flash fallback rule: ThinkingLevel.LOW without deprecated sampling params
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (typeof params.temperature === "number") {
    config.temperature = params.temperature;
  }

  return config;
}

async function generateWithGemini(params: {
  task: TaskKey;
  costProfile: CostProfile;
  contents: unknown;
  systemInstruction?: string;
  responseSchema?: Schema;
  temperature?: number;
}): Promise<{ text: string; usage: UsageMetadata }> {
  const ai = getGeminiClient();
  const modelChain = getTaskModelChain(params.task, params.costProfile);
  const unavailableModels = new Set<string>();
  let lastError: unknown = null;
  let transientError: unknown = null;
  let quotaError: unknown = null;
  let detectedRetrySeconds: number | undefined;

  const maxRounds = 2;
  for (let round = 1; round <= maxRounds; round++) {
    if (round > 1) {
      const backoffMs = 1500 + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    let attemptedAnyInRound = false;

    for (const model of modelChain) {
      if (unavailableModels.has(model)) continue;
      attemptedAnyInRound = true;

      const startTime = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents as Parameters<typeof ai.models.generateContent>[0]["contents"],
          config: buildModelConfig(model, {
            systemInstruction: params.systemInstruction,
            responseSchema: params.responseSchema,
            temperature: params.temperature,
          }),
        });

        if (response?.text) {
          const latencyMs = Date.now() - startTime;
          const meta = response.usageMetadata as
            | {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                thoughtsTokenCount?: number;
                totalTokenCount?: number;
                cachedContentTokenCount?: number;
              }
            | undefined;

          const promptTokenCount = meta?.promptTokenCount ?? 0;
          const candidatesTokenCount = meta?.candidatesTokenCount ?? 0;
          const thoughtsTokenCount = meta?.thoughtsTokenCount ?? 0;
          const cachedTokenCount = meta?.cachedContentTokenCount ?? 0;
          const totalTokenCount =
            meta?.totalTokenCount ?? promptTokenCount + candidatesTokenCount + thoughtsTokenCount;

          const estimatedCostUsd = estimateTokenCostUsd(
            model,
            promptTokenCount,
            candidatesTokenCount,
            thoughtsTokenCount,
            cachedTokenCount
          );

          return {
            text: response.text,
            usage: {
              task: params.task,
              model,
              costProfile: params.costProfile,
              promptTokenCount,
              candidatesTokenCount,
              thoughtsTokenCount,
              totalTokenCount,
              estimatedCostUsd,
              latencyMs,
            },
          };
        }
      } catch (err: unknown) {
        lastError = err;
        const rawMsg = err instanceof Error ? err.message : String(err);
        const info = cleanErrorMessage(err);
        console.warn(
          `[Gemini Routing] task=${params.task} profile=${params.costProfile} model=${model} round=${round} failed: ${rawMsg.slice(0, 180)}`
        );

        if (info.isQuota) {
          if (!quotaError) quotaError = err;
          if (info.retrySeconds) detectedRetrySeconds = info.retrySeconds;
          unavailableModels.add(model);
          continue;
        }

        // Do not retry permanently unavailable / invalid models
        if (
          rawMsg.includes("404") ||
          rawMsg.includes("NOT_FOUND") ||
          rawMsg.includes("no longer available") ||
          rawMsg.includes("400") ||
          rawMsg.includes("INVALID_ARGUMENT")
        ) {
          unavailableModels.add(model);
          continue;
        }

        if (!transientError) transientError = err;
      }
    }

    if (!attemptedAnyInRound) break;
  }

  if (quotaError) {
    const quotaInfo = cleanErrorMessage(quotaError);
    const err = new Error(quotaInfo.message) as Error & { code?: string; retrySeconds?: number };
    err.code = "QUOTA_EXCEEDED";
    err.retrySeconds = detectedRetrySeconds || quotaInfo.retrySeconds;
    throw err;
  }

  const cleaned = cleanErrorMessage(transientError || lastError);
  throw new Error(cleaned.message || "All configured Free-Tier models failed to respond. Please try again.");
}

function sanitizeSeniorFromRoles(resume: TailoredResume): TailoredResume {
  const stripRoleTitleSenior = (title: string) =>
    title
      .replace(/\b(Senior|Sr\.?)\s+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  if (Array.isArray(resume.experience)) {
    resume.experience = resume.experience.map((exp) => ({
      ...exp,
      role: exp.role ? stripRoleTitleSenior(exp.role) : exp.role,
    }));
  }

  if (typeof resume.summary === "string") {
    resume.summary = resume.summary
      .replace(/^(Senior|Sr\.?)\s+/i, "")
      .replace(
        /\b(Senior|Sr\.?)\s+(Cloud|DevSecOps|DevOps|IAM|Site Reliability|SRE|Software|AWS|Azure|GCP|Security|Infrastructure|Platform|Systems|Solutions)\b/gi,
        "$2"
      );
  }

  return resume;
}

function normalizeExpKey(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/\b(senior|sr\.?)\s+/gi, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreExperienceMatch(src: WorkExperience, gen: WorkExperience): number {
  const srcCompany = normalizeExpKey(src.company);
  const genCompany = normalizeExpKey(gen.company);
  const srcDuration = normalizeExpKey(src.duration);
  const genDuration = normalizeExpKey(gen.duration);
  const srcRole = normalizeExpKey(src.role);
  const genRole = normalizeExpKey(gen.role);

  let score = 0;

  if (srcCompany && srcCompany === genCompany) {
    score += 4;
  } else if (srcCompany && genCompany && (srcCompany.includes(genCompany) || genCompany.includes(srcCompany))) {
    score += 2;
  }

  if (srcDuration && srcDuration === genDuration) {
    score += 6;
  } else if (srcDuration && genDuration) {
    const srcYears: string[] = srcDuration.match(/\b20\d{2}\b/g) ?? [];
    const genYears: string[] = genDuration.match(/\b20\d{2}\b/g) ?? [];
    if (srcYears.length > 0 && srcYears.every((y) => genYears.includes(y))) {
      score += 3;
    }
  }

  if (srcRole && srcRole === genRole) {
    score += 5;
  } else if (srcRole && genRole) {
    const srcTokens = new Set(srcRole.split(" ").filter((t) => t.length > 2));
    const genTokens = new Set(genRole.split(" ").filter((t) => t.length > 2));
    let overlap = 0;
    for (const token of srcTokens) {
      if (genTokens.has(token)) overlap += 1;
    }
    if (overlap > 0) {
      score += Math.min(4, overlap * 2);
    }
  }

  // Prevent matching an internship entry to a non-internship entry if both exist
  const srcIsIntern = srcRole.includes("intern");
  const genIsIntern = genRole.includes("intern");
  if (srcIsIntern !== genIsIntern && srcCompany === genCompany) {
    score -= 3;
  }

  return score;
}

function ensureAllExperiencesIncluded(
  resume: TailoredResume,
  sourceExperience: WorkExperience[] | undefined,
  allowExtraEntries = false,
  targetRole?: string
): TailoredResume {
  const filteredSource = Array.isArray(sourceExperience)
    ? sourceExperience.filter((exp) => !isTechnicalProjectEntry(exp))
    : [];
  const generated = (Array.isArray(resume.experience) ? resume.experience : []).filter(
    (exp) => !isTechnicalProjectEntry(exp)
  );

  if (filteredSource.length === 0) {
    return {
      ...resume,
      experience: generated,
    };
  }

  const pairs: { srcIdx: number; genIdx: number; score: number }[] = [];

  for (let s = 0; s < filteredSource.length; s++) {
    for (let g = 0; g < generated.length; g++) {
      const score = scoreExperienceMatch(filteredSource[s], generated[g]);
      if (score >= 4) {
        pairs.push({ srcIdx: s, genIdx: g, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const matchedSrcToGen = new Map<number, number>();
  const usedGenIndices = new Set<number>();

  for (const pair of pairs) {
    if (!matchedSrcToGen.has(pair.srcIdx) && !usedGenIndices.has(pair.genIdx)) {
      matchedSrcToGen.set(pair.srcIdx, pair.genIdx);
      usedGenIndices.add(pair.genIdx);
    }
  }

  const reconciled: WorkExperience[] = filteredSource.map((src, idx) => {
    const alignedFallbackRole = targetRole
      ? resolveTargetAlignedRoleTitle(src, idx, targetRole)
      : src.role;
    const genIdx = matchedSrcToGen.get(idx);

    if (genIdx === undefined) {
      return {
        company: src.company,
        role: alignedFallbackRole,
        duration: src.duration,
        bullets: Array.isArray(src.bullets) ? [...src.bullets] : [],
      };
    }

    const gen = generated[genIdx];
    const cleanBullets = Array.isArray(gen.bullets)
      ? gen.bullets.map((b) => String(b || "").trim()).filter(Boolean)
      : [];

    // For work roles during tailoring, ensure the title actually corresponds to the targetRole progression
    const genRole = gen.role?.trim() || alignedFallbackRole;
    const finalRole =
      targetRole && normalizeExpKey(genRole) === normalizeExpKey(src.role)
        ? alignedFallbackRole
        : genRole;

    return {
      company: src.company,
      role: finalRole,
      duration: src.duration,
      bullets: cleanBullets.length > 0 ? cleanBullets : [...(src.bullets || [])],
    };
  });

  if (allowExtraEntries) {
    for (let g = 0; g < generated.length; g++) {
      if (!usedGenIndices.has(g)) {
        const extra = generated[g];
        if (extra?.company && extra?.role && !isTechnicalProjectEntry(extra)) {
          reconciled.push(extra);
        }
      }
    }
  }

  return {
    ...resume,
    experience: reconciled,
  };
}

const resumeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Professional summary tailored to the role" },
    skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of relevant technical skills" },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of relevant certifications" },
    education: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of education background" },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          duration: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["company", "role", "duration", "bullets"],
      },
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        matchScore: { type: Type.NUMBER, description: "Score from 98-100 indicating fit" },
        keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
        toneNotes: { type: Type.STRING, description: "Explanation of tone adjustments" },
      },
      required: ["matchScore", "keywordsUsed", "toneNotes"],
    },
  },
  required: ["summary", "skills", "certifications", "education", "experience", "analysis"],
};

function sendRouteError(res: Response, routeLabel: string, error: unknown): void {
  console.error(`[${routeLabel} error]:`, error);
  const errObj = error as { code?: string; retrySeconds?: number } | null;
  const cleaned = cleanErrorMessage(error);
  res.status(errObj?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
    error: cleaned.message,
    code: errObj?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
    retrySeconds: errObj?.retrySeconds || cleaned.retrySeconds,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Health Check Routes (Railway & App Diagnostics)
  const handleHealth = (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      defaultProfile: "eco",
      models: ACTIVE_FREE_TIER_MODEL_IDS,
      routing: {
        eco: Object.fromEntries(
          Object.entries(TASK_ROUTING_POLICIES).map(([k, v]) => [k, v.chains.eco])
        ),
        hybrid: Object.fromEntries(
          Object.entries(TASK_ROUTING_POLICIES).map(([k, v]) => [k, v.chains.hybrid])
        ),
      },
    });
  };
  app.get("/health", handleHealth);
  app.get("/api/health", handleHealth);

  // 1. Tailor Resume Endpoint (Canonical + Backward-Compatible Alias)
  const handleTailorResume = async (req: Request, res: Response) => {
    try {
      const { jobDescription, targetRole, baseResume, jobLink, costProfile } = req.body as {
        jobDescription: string;
        targetRole: TargetRole;
        baseResume: ResumeData;
        jobLink?: string;
        costProfile?: CostProfile;
      };

      if (!jobDescription?.trim()) {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);
      const roleIntelligence = getRoleIntelligence(ROLE_TAILORING_PROMPTS, targetRole);
      const progressionGuide = getRoleProgressionGuide(targetRole);
      const sourceExperience = (
        Array.isArray(baseResume?.experience) ? baseResume.experience : []
      ).filter((exp) => !isTechnicalProjectEntry(exp));
      const sanitizedBaseResume: ResumeData = {
        ...baseResume,
        experience: sourceExperience,
      };
      const requiredExperienceManifest = sourceExperience
        .map((exp, idx) => {
          const alignedRole = resolveTargetAlignedRoleTitle(exp, idx, targetRole);
          return `   ${idx + 1}. Company: "${exp.company}" | Target-Aligned Role Title: "${alignedRole}" | Duration: "${exp.duration}"`;
        })
        .join("\n");

      const systemPrompt = `You are RoleArchitect, an elite career strategist and ATS resume optimization engine.
PRIMARY DIRECTIVE: Tailor the candidate's CV role titles and professional experience duties so every role and bullet point corresponds directly to the Target Role (${targetRole}) and achieves an exact 98–100 MATCHING SCORE against the Job Description (JD) while preserving ALL employment experience entries from the base resume.

TARGET ROLE: ${targetRole}
ROLE INTELLIGENCE: ${roleIntelligence}
ROLE PROGRESSION & EXPERIENCE ALIGNMENT:
- Focus: ${progressionGuide.experienceFocus}
- Current Role Title: "${progressionGuide.currentRole}" (full architecture, governance, technical ownership, and production delivery for ${targetRole})
- Prior Full-Time Role Title: "${progressionGuide.midRole}" (hands-on engineering, automation, and scalable implementation building toward ${targetRole})
- Internship Role Title: "${progressionGuide.internRole}" (authentic foundational cloud/systems execution, monitoring, scripting, and operational support aligned to ${targetRole})

CORE RULES:
1. EXHAUSTIVE JD DUTY & TARGET ROLE ALIGNMENT (98–100% SCORE):
   - Map every core duty, platform, tool, protocol, framework, and methodology from the JD directly into the candidate's experience bullets using exact JD terminology.
   - Ensure the candidate's career trajectory reads cohesively for a ${targetRole} hiring manager: every role title and every bullet point must clearly reinforce ${targetRole} competencies while staying grounded in Cloud Engineering.
2. COMPLETE EMPLOYMENT EXPERIENCE COVERAGE (ALL ${sourceExperience.length} ENTRIES MANDATORY — NO FOOTER TECHNICAL PROJECTS):
   - You MUST output ALL ${sourceExperience.length} employment entries in the "experience" array in the exact same chronological order as the base resume.
   - NEVER omit, drop, skip, or merge any employment entry — keep every full-time role, internship, and duplicate-company role with separate dates listed separately.
   - NEVER append or generate "TECHNICAL PROJECT" or "Technical Summary" entries at the footer of the experience section.
   - Formula: [Strong JD-aligned Action Verb] + [Exact JD Responsibility / Technical Stack / Architecture Scope] + [Execution Context / Methodology] + [Measurable Business / Security / Performance Metric].
   - Generate 8–12 dense, technically authoritative, quantifiable bullet points per employment role (10–12 for current/recent roles) tailored to ${targetRole} and the JD.
3. FACTUAL INTEGRITY, 5 YEARS CLOUD ENGINEERING EXPERIENCE & NO "SENIOR" LABELS (MANDATORY):
   - Strictly maintain **5 years of Cloud Engineering experience** across the summary and career timeline. NEVER inflate (e.g., 7+, 8+, 10+ years) or reduce (e.g., 2–3 years) even if the JD asks for a different number.
   - NEVER use "Senior" or "Sr." when describing the candidate's roles, job titles, or summary identity (even if the JD title contains "Senior").
   - Preserve exact factual company names and employment dates from the base profile while aligning role titles to the Target-Aligned Role Titles listed in the manifest.
4. TECHNICAL DEPTH:
   - Never dilute or write generic bullets; include specific tools, architectures, protocols, and quantified outcomes suitable for a rich multi-page resume.`;

      const userPrompt = `BASE RESUME DATA:
${JSON.stringify(sanitizedBaseResume)}
${jobLink ? `\nTARGET JOB LINK: ${jobLink}` : ""}

REQUIRED EMPLOYMENT EXPERIENCE ENTRIES (INCLUDE ALL ${sourceExperience.length} ENTRIES IN THIS EXACT ORDER — USE THE TARGET-ALIGNED ROLE TITLES, DO NOT OMIT OR MERGE ANY, AND DO NOT ADD TECHNICAL PROJECT FOOTER ENTRIES):
${requiredExperienceManifest}

TARGET JOB DESCRIPTION:
${jobDescription}

INSTRUCTIONS:
1. Rewrite "summary" (4–6 sentences) positioning the candidate directly as a ${targetRole} with **5 years of Cloud Engineering experience** and aligning directly with the top 4–5 JD requirements. Never change "5 years" and never use "Senior" or "Sr." for her title.
2. Reconstruct ALL ${sourceExperience.length} employment entries in "experience":
   - Preserve exact factual companies and dates.
   - Use the Target-Aligned Role Titles from the manifest (without "Senior" or "Sr.") so every role corresponds naturally to ${targetRole}.
   - Tailor every bullet point under each role so duties progress authentically from foundational execution (Intern) -> hands-on implementation (Prior role) -> architecture & ownership (Current role), expanding to 8–12 dense JD-aligned bullets per employment role.
   - Do NOT include any "TECHNICAL PROJECT" or "Technical Summary" footer entries.
3. Curate "skills", "certifications", and "education" so all ${targetRole} and JD technologies are prominently grouped and highlighted first.
4. Populate "analysis" with "matchScore" strictly 98–100, exact "keywordsUsed" from the JD, and concise "toneNotes" explaining how roles and duties were aligned to ${targetRole}.
5. Return JSON only.`;

      const { text, usage } = await generateWithGemini({
        task: "tailor-resume",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: systemPrompt,
        responseSchema: resumeSchema,
        temperature: 0.35,
      });

      const parsedTailored = JSON.parse(text) as TailoredResume;
      const withAllExperiences = ensureAllExperiencesIncluded(
        parsedTailored,
        sourceExperience,
        false,
        targetRole
      );
      const tailoredData = sanitizeSeniorFromRoles(withAllExperiences);
      const rawScore = Number(tailoredData.analysis?.matchScore) || 99;
      tailoredData.analysis.matchScore = Math.min(100, Math.max(98, Math.round(rawScore)));
      tailoredData._usage = usage;

      res.json(tailoredData);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/tailor-resume", error);
    }
  };
  app.post("/api/gemini/tailor-resume", handleTailorResume);
  app.post("/api/gemini/tailor", handleTailorResume);

  // 2. Optimize Resume Endpoint (Canonical + Backward-Compatible Alias)
  const handleOptimizeResume = async (req: Request, res: Response) => {
    try {
      const { currentResume, userPrompt, costProfile } = req.body as {
        currentResume: TailoredResume;
        userPrompt: string;
        costProfile?: CostProfile;
      };

      if (!userPrompt?.trim()) {
        res.status(400).json({ error: "Instruction prompt is required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);
      const currentExperience = (
        Array.isArray(currentResume?.experience) ? currentResume.experience : []
      ).filter((exp) => !isTechnicalProjectEntry(exp));
      const cleanCurrentResume: TailoredResume = {
        ...currentResume,
        experience: currentExperience,
      };
      const userRequestedRemoval = /\b(remove|delete|drop|omit|exclude)\b.*\b(role|experience|job|intern|internship|project|entry)\b/i.test(
        userPrompt
      );

      const systemInstruction = `You are an expert ATS resume optimizer. Apply the user's instruction while preserving the exact JSON schema and all existing detail unless removal is explicitly requested.
CRITICAL:
- Preserve ALL ${currentExperience.length} employment experience entries in "experience" in their exact order unless the user explicitly asks to remove a specific role.
- Do NOT add "TECHNICAL PROJECT" or "Technical Summary" entries at the footer of the experience list.
- Keep experience duties tightly matched to the target role and JD (matchScore strictly 98–100).
- Maintain **5 years of Cloud Engineering experience** consistently in the summary and employment timeline (preserve factual dates unless explicitly instructed otherwise).
- NEVER include "Senior" or "Sr." in the candidate's roles, job titles, or summary.

CURRENT RESUME:
${JSON.stringify(cleanCurrentResume)}`;

      const prompt = `USER INSTRUCTION:
"${userPrompt}"

Return the updated resume JSON preserving all ${currentExperience.length} employment experience entries (unless removal was explicitly requested), without any "TECHNICAL PROJECT" footer entries, maintaining a 98–100 matching score, 5 years of Cloud Engineering experience, and no "Senior" or "Sr." role labels.`;

      const { text, usage } = await generateWithGemini({
        task: "optimize-resume",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction,
        responseSchema: resumeSchema,
        temperature: 0.35,
      });

      const parsedOptimized = JSON.parse(text) as TailoredResume;
      const strippedOptimized: TailoredResume = {
        ...parsedOptimized,
        experience: (Array.isArray(parsedOptimized.experience)
          ? parsedOptimized.experience
          : []
        ).filter((exp) => !isTechnicalProjectEntry(exp)),
      };
      const reconciledOptimized = userRequestedRemoval
        ? strippedOptimized
        : ensureAllExperiencesIncluded(strippedOptimized, currentExperience, true);
      const tailoredData = sanitizeSeniorFromRoles(reconciledOptimized);
      const rawScore = Number(tailoredData.analysis?.matchScore) || 99;
      tailoredData.analysis.matchScore = Math.min(100, Math.max(98, Math.round(rawScore)));
      tailoredData._usage = usage;

      res.json(tailoredData);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/optimize-resume", error);
    }
  };
  app.post("/api/gemini/optimize-resume", handleOptimizeResume);
  app.post("/api/gemini/optimize", handleOptimizeResume);

  // 3. Cover Letter Endpoint
  app.post("/api/gemini/cover-letter", async (req: Request, res: Response) => {
    try {
      const { companyName, hiringManager, targetRole, baseResume, jobDescription, costProfile } =
        req.body as {
          companyName: string;
          hiringManager?: string;
          targetRole: TargetRole;
          baseResume: ResumeData;
          jobDescription?: string;
          costProfile?: CostProfile;
        };

      if (!companyName?.trim()) {
        res.status(400).json({ error: "Company name is required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);
      const roleHint = getRoleIntelligence(ROLE_COVER_LETTER_HINTS, targetRole);

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: "The full markdown formatted cover letter" },
        },
        required: ["content"],
      };

      const prompt = `You are an Executive Career Strategist writing a tailored Cover Letter.
TARGET ROLE: ${targetRole}
ROLE FOCUS: ${roleHint}
COMPANY: ${companyName}
HIRING MANAGER: ${hiringManager || "Hiring Manager"}

RULES:
- Confident, evidence-based tone citing specific quantified wins from the resume.
- Consistently reflect **5 years of Cloud Engineering experience** (never inflate or reduce).
- NEVER use "Senior" or "Sr." when describing the candidate's current or past roles or title.
- Open with a sharp hook tied directly to the JD's core technical needs; zero generic fluff.

CANDIDATE DATA:
${JSON.stringify(baseResume)}

JOB DESCRIPTION:
${jobDescription || "No specific JD provided; emphasize core Cloud Engineering and role excellence."}`;

      const { text, usage } = await generateWithGemini({
        task: "cover-letter",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseSchema: schema,
        temperature: 0.4,
      });

      const parsed = JSON.parse(text) as { content: string; _usage?: UsageMetadata };
      parsed._usage = usage;
      res.json(parsed);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/cover-letter", error);
    }
  });

  // 4. Application Question Assistant Endpoint (Canonical + Backward-Compatible Alias)
  const handleApplicationAnswer = async (req: Request, res: Response) => {
    try {
      const { question, targetRole, baseResume, wordLimit, jobDescription, jobLink, costProfile } =
        req.body as {
          question: string;
          targetRole: TargetRole;
          baseResume: ResumeData;
          wordLimit?: number;
          jobDescription?: string;
          jobLink?: string;
          costProfile?: CostProfile;
        };

      if (!question?.trim()) {
        res.status(400).json({ error: "Question is required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);
      const roleHint = getRoleIntelligence(ROLE_QA_HINTS, targetRole);

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          generated_answer: { type: Type.STRING },
          confidence_note: { type: Type.STRING },
          intent_detected: {
            type: Type.STRING,
            description: "Technical, Behavioral, Governance, or Role Fit",
          },
        },
        required: ["generated_answer", "confidence_note", "intent_detected"],
      };

      const prompt = `You are an Application Question Assistant answering employer portal questions using the candidate profile.
TARGET ROLE: ${targetRole}
ROLE FOCUS: ${roleHint}
WORD LIMIT: ${wordLimit ? `${wordLimit} words` : "Concise (approx 200 words)"}
RULES:
- Consistently reflect **5 years of Cloud Engineering experience** (never inflate or reduce).
- NEVER use "Senior" or "Sr." when describing her current or past roles or title.

QUESTION:
${question}

CANDIDATE PROFILE:
${JSON.stringify(baseResume)}

JOB CONTEXT:
${jobDescription || "Standard role context"}${jobLink ? `\nJOB LINK: ${jobLink}` : ""}`;

      const { text, usage } = await generateWithGemini({
        task: "application-answer",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseSchema: schema,
        temperature: 0.3,
      });

      const parsed = JSON.parse(text) as {
        generated_answer: string;
        confidence_note: string;
        intent_detected: string;
        _usage?: UsageMetadata;
      };
      parsed._usage = usage;
      res.json(parsed);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/application-answer", error);
    }
  };
  app.post("/api/gemini/application-answer", handleApplicationAnswer);
  app.post("/api/gemini/answer-question", handleApplicationAnswer);

  // 5. Parse Resume Text Endpoint
  app.post("/api/gemini/parse-resume", async (req: Request, res: Response) => {
    try {
      const { text, costProfile } = req.body as {
        text: string;
        costProfile?: CostProfile;
      };
      if (!text?.trim()) {
        res.status(400).json({ error: "Text content is required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);

      const parseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          contact: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              linkedin: { type: Type.STRING },
            },
            required: ["location", "email"],
          },
          summary: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          education: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                role: { type: Type.STRING },
                duration: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["company", "role", "duration", "bullets"],
            },
          },
        },
        required: ["name", "contact", "summary", "skills", "experience"],
      };

      const prompt = `Extract structured resume data from the text below into the JSON schema. Preserve each bullet under experience as an individual string.

RESUME TEXT:
${text}`;

      const { text: responseText, usage } = await generateWithGemini({
        task: "parse-resume",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseSchema: parseSchema,
        temperature: 0.2,
      });

      const parsed = JSON.parse(responseText) as ResumeData & { _usage?: UsageMetadata };
      parsed._usage = usage;
      res.json(parsed);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/parse-resume", error);
    }
  });

  // 6. Gap Analysis Endpoint (JD vs. Tailored Resume Semantic Audit)
  app.post("/api/gemini/gap-analysis", async (req: Request, res: Response) => {
    try {
      const { jobDescription, tailoredResume, targetRole, costProfile } = req.body as {
        jobDescription: string;
        tailoredResume: TailoredResume;
        targetRole: TargetRole;
        costProfile?: CostProfile;
      };

      if (!jobDescription?.trim() || !tailoredResume) {
        res.status(400).json({ error: "Both jobDescription and tailoredResume are required" });
        return;
      }

      const activeProfile = normalizeCostProfile(costProfile);

      const gapSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          overallCoverageScore: {
            type: Type.NUMBER,
            description: "Honest JD coverage score from 0 to 100 based on actual text present in the tailored resume",
          },
          executiveSummary: {
            type: Type.STRING,
            description: "2-3 sentence summary of the strongest alignments and the highest-impact gaps",
          },
          missingKeywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                category: { type: Type.STRING },
                priority: { type: Type.STRING, description: "Critical, High, or Recommended" },
                jdEvidence: { type: Type.STRING, description: "Short quote or phrase from JD showing requirement" },
                suggestedPlacement: {
                  type: Type.STRING,
                  description: "Summary, Skills, Experience, or Certifications",
                },
                actionTip: { type: Type.STRING, description: "Specific way to add this term truthfully" },
              },
              required: ["term", "category", "priority", "jdEvidence", "suggestedPlacement", "actionTip"],
            },
          },
          underrepresentedSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                currentLocation: { type: Type.STRING },
                recommendation: { type: Type.STRING },
              },
              required: ["term", "currentLocation", "recommendation"],
            },
          },
          strongMatches: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "overallCoverageScore",
          "executiveSummary",
          "missingKeywords",
          "underrepresentedSkills",
          "strongMatches",
        ],
      };

      const prompt = `You are a strict ATS & Hiring Manager Gap Auditor.
Compare the TAILORED RESUME against the JOB DESCRIPTION for the target role (${targetRole}).
Identify:
1. Missing keywords, tools, platforms, security/compliance frameworks, methodologies, or critical skills required or emphasized in the JD that do NOT appear in the tailored resume.
2. Under-represented skills that appear ONLY in the Skills list without proof in Experience bullets.
3. Strong matches already well-evidenced.

RULES:
- Be rigorously factual: only flag a term as missing if it is genuinely absent from the tailored resume text.
- Never recommend adding "Senior" or inflating years of experience beyond 5 years of Cloud Engineering experience.
- Prioritize the top 10 most impactful gaps.

JOB DESCRIPTION:
${jobDescription}

TAILORED RESUME:
${JSON.stringify({
  summary: tailoredResume.summary,
  skills: tailoredResume.skills,
  certifications: tailoredResume.certifications,
  education: tailoredResume.education,
  experience: tailoredResume.experience,
})}`;

      const { text: responseText, usage } = await generateWithGemini({
        task: "gap-analysis",
        costProfile: activeProfile,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseSchema: gapSchema,
        temperature: 0.2,
      });

      const parsed = JSON.parse(responseText) as GapAnalysisResult;
      parsed.overallCoverageScore = Math.min(
        100,
        Math.max(0, Math.round(Number(parsed.overallCoverageScore) || 0))
      );
      parsed._usage = usage;
      res.json(parsed);
    } catch (error: unknown) {
      sendRouteError(res, "/api/gemini/gap-analysis", error);
    }
  });

  // Vite middleware setup (Development vs Production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 5 path-less SPA fallback
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[RoleArchitect Server] Running on http://0.0.0.0:${PORT} (Free-Tier Hybrid Routing: ${ACTIVE_FREE_TIER_MODEL_IDS.join(" -> ")})`
    );
  });
}

startServer();
