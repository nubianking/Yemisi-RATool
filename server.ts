import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TargetRole, ResumeData, TailoredResume } from "./types";

const PORT = 3000;

// Model hierarchy: High performance fast flash model -> Pro model fallback -> Alternate flash models
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please check Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function cleanErrorMessage(raw: any): { message: string; isQuota: boolean; retrySeconds?: number } {
  let text = typeof raw === 'string' ? raw : (raw?.message || String(raw));
  let retrySeconds: number | undefined;

  // Try parsing stringified JSON
  try {
    if (typeof text === 'string' && text.trim().startsWith('{')) {
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
  } catch {}

  const isQuota = text.includes("429") || 
                  text.includes("RESOURCE_EXHAUSTED") || 
                  text.toLowerCase().includes("quota exceeded") ||
                  text.toLowerCase().includes("free_tier_requests");

  if (isQuota) {
    const match = text.match(/retry in ([0-9.]+)s/i);
    if (match && match[1]) {
      retrySeconds = Math.ceil(parseFloat(match[1]));
    }
    const cleanMsg = retrySeconds 
      ? `Gemini API free-tier quota has been reached. Please retry in ${retrySeconds} seconds, or connect your Gemini API key with billing enabled to remove limits.`
      : "Gemini API free-tier quota limit reached. Please connect your Gemini API key in Settings > Secrets to continue generating without interruption, or wait for the quota to reset.";
    return { message: cleanMsg, isQuota: true, retrySeconds };
  }

  if (text.includes("503") || text.includes("high demand") || text.includes("UNAVAILABLE")) {
    return { 
      message: "The AI service is experiencing high demand. Please try clicking Generate again in a few moments.", 
      isQuota: false 
    };
  }

  return { message: text, isQuota: false };
}

async function generateWithGemini(params: {
  contents: any;
  systemInstruction?: string;
  responseSchema?: Schema;
  temperature?: number;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;
  let encounteredQuota = false;
  let detectedRetrySeconds: number | undefined;

  for (const model of CANDIDATE_MODELS) {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: params.responseSchema ? "application/json" : undefined,
            responseSchema: params.responseSchema,
            temperature: params.temperature ?? 0.35
          }
        });
        if (response?.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const info = cleanErrorMessage(err);

        if (info.isQuota) {
          encounteredQuota = true;
          if (info.retrySeconds) detectedRetrySeconds = info.retrySeconds;
          // Don't retry same model on 429 quota exhaustion; try next candidate model
          break;
        }

        // On 503 temporary demand spike, wait briefly and retry
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1200 * attempt));
        }
      }
    }
  }

  if (encounteredQuota) {
    const quotaInfo = cleanErrorMessage(lastError);
    const err: any = new Error(quotaInfo.message);
    err.code = "QUOTA_EXCEEDED";
    err.retrySeconds = detectedRetrySeconds || quotaInfo.retrySeconds;
    throw err;
  }

  const cleaned = cleanErrorMessage(lastError);
  throw new Error(cleaned.message || "All AI models failed to respond. Please try again.");
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
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["company", "role", "duration", "bullets"]
      }
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        matchScore: { type: Type.NUMBER, description: "Score from 98-100 indicating fit" },
        keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
        toneNotes: { type: Type.STRING, description: "Explanation of tone adjustments" }
      },
      required: ["matchScore", "keywordsUsed", "toneNotes"]
    }
  },
  required: ["summary", "skills", "certifications", "education", "experience", "analysis"]
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      models: CANDIDATE_MODELS
    });
  });

  // 1. Tailor Resume Endpoint
  app.post("/api/gemini/tailor", async (req, res) => {
    try {
      const { jobDescription, targetRole, baseResume, jobLink } = req.body as {
        jobDescription: string;
        targetRole: TargetRole;
        baseResume: ResumeData;
        jobLink?: string;
      };

      if (!jobDescription?.trim()) {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      const systemPrompt = `
    You are RoleArchitect, an elite career strategist and ATS resume optimization engine. 
    PRIMARY DIRECTIVE:
    Meticulously engineer and tailor the candidate's duties under professional experiences to achieve an exact 98 - 100 MATCHING SCORE against the provided Job Description (JD) and Target Role.
    
    TARGET ROLE: ${targetRole}

    CORE PRINCIPLES FOR 98 - 100% DUTY-TO-JD MATCHING:
    1. EXHAUSTIVE JD DUTY MAPPING (98 - 100% SCORE REQUIREMENT):
       - Parse every single duty, responsibility, qualification, platform, tool, protocol, methodology, and workflow specified in the Job Description.
       - Every duty (bullet point) under "experience" must be surgically tailored to directly reflect and fulfill the JD's requirements.
       - Infuse the JD's exact technical terminology, keywords, tools, and phrasing directly into the experience bullet points.
       - If the JD mentions specific platforms (e.g. AWS, Azure, GCP, Kubernetes, Terraform, Docker), security frameworks (e.g. NIST, SOC 2, ISO 27001, CIS), identity tools (e.g. Entra ID, Okta, Ping, PIM), or CI/CD pipelines (e.g. GitHub Actions, GitLab CI, Jenkins), embed them directly and organically into the candidate's duties.
       - No core responsibility from the JD should be left unaddressed in the candidate's experience duties.

    2. EXPERIENCE DUTY STRUCTURE:
       - Every bullet point under every job experience must strictly follow this high-performance formula:
         [Strong JD-aligned Action Verb] + [Exact JD Responsibility / Technical Stack / Architecture Scope] + [Execution Context / Methodology] + [Measurable Business Metric / Performance Outcome / Efficiency Improvement / Security Hardening Win].
       - Generate AT LEAST 8 to 12 dense, technically rich, and quantifiable bullet points per role (especially 10-12 for senior and recent roles).
       - Maintain chronological progression: senior/current roles cover architecture, governance, leadership, and high-impact delivery matching the JD; prior roles reinforce foundational execution of the JD requirements.

    3. FACTUAL INTEGRITY WITH HIGH RELEVANCE:
       - Preserve the candidate's factual company names, titles, and dates from the base profile.
       - Elevate and reframe the narrative of their actual duties to match the exact vocabulary, problems, and technical expectations of the target JD.
       - Contextualize accomplishments so an ATS parser and senior engineering manager evaluate the candidate at a 98%–100% match.

    4. TECHNICAL DEPTH:
       - Never summarize, dilute, or write generic bullet points.
       - Include specific tools, commands, protocols, architectures, and metrics.
       - The output must be comprehensive and verbose enough to comfortably form a rich, multi-page executive resume.

    5. ROLE INTELLIGENCE:
       - If Cloud Security: Focus on risk, governance, audit, IAM, WAF, Zero Trust, Compliance frameworks (NIST, SOC2).
       - If Cloud Engineer (General): Focus on reliability, scale, cost optimization, IaC patterns, multi-region architectures.
       - If DevSecOps: Focus on CI/CD security, container hardening, shift-left security, policy-as-code.
       - If DevOps Engineer: Focus on delivery pipelines, reliability, IaC, automation, observability. (Suppress security/compliance focus).
       - If IAM Engineer: Focus on identity lifecycle, RBAC/ABAC, SSO, federation, zero trust access. (Suppress general DevOps tasks).
       - If AWS Cloud Engineer: Deep-dive AWS native services (IAM, VPC, EKS, KMS, CloudTrail, GuardDuty).
       - If Azure Cloud Engineer: Deep-dive Azure enterprise stack (Entra ID, Azure Policy, Sentinel, Defender).
       - If Cloud Solution Architect: Focus on end-to-end solution design, cloud patterns, multi-tier systems, NFRs (availability, scalability), and cost modeling.
       - If Azure Cloud Architect: Deep-dive Azure Architecture Center frameworks (CAF, WAF), enterprise landing zones, management groups, express route, and governance at scale.
       - If Site Reliability Engineer: Focus on SLOs/SLAs/SLIs, error budgets, telemetry (OpenTelemetry, Prometheus, Datadog), chaos engineering, post-mortems, and toil reduction.
       - If Software Engineer: Focus on backend/distributed systems, API design, code maintainability, testing paradigms, data structures, and runtime performance.
    `;

      const userPrompt = `
    BASE RESUME DATA:
    ${JSON.stringify(baseResume)}

    ${jobLink ? `TARGET JOB LINK: ${jobLink}` : ''}
    
    TARGET JOB DESCRIPTION:
    ${jobDescription}

    INSTRUCTIONS:
    1. Analyze the Job Description (JD) comprehensively for all core duties, technical requirements, tools, frameworks, protocols, and performance metrics.
    2. Rewrite the "Summary" into a powerful, executive summary (4-6 sentences) explicitly aligning the candidate's senior profile with the top 4-5 duties and requirements of the JD.
    3. Reconstruct the "Experience" duties:
       - EXPAND on the base resume's points. Do not truncate, summarize, or omit them.
       - Ensure a minimum of 8 to 12 dense, technically authoritative bullet points per job role.
       - Every bullet point must be a tailored duty directly aligned to the JD's requirements and stated responsibilities.
       - Strictly enforce the structure: [Action Verb from JD] + [Deep Technical Context & Specific JD Duty / Platform] + [Specific Tools & Methodologies from JD] + [Quantitative Business / Operational Impact].
       - Match the JD's terminology with 100% precision.
       - Guarantee that the candidate's duties demonstrate mastery of 98% to 100% of the responsibilities outlined in the JD.
    4. Curate the "Skills", "Certifications", and "Education" sections so all technical competencies mentioned in the JD are prominently grouped and highlighted.
    5. In the "analysis" output field:
       - Provide a "matchScore" strictly between 98 and 100 (e.g., 98, 99, or 100), reflecting the exhaustive alignment of experience duties with the JD.
       - List all key "keywordsUsed" extracted directly from the JD and woven into the duties.
       - In "toneNotes", provide a clear summary of how the duties under each experience were tailored to achieve the 98 - 100 matching score.
    6. Return JSON only.
    `;

      const response = await generateWithGemini({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: systemPrompt,
        responseSchema: resumeSchema,
        temperature: 0.35
      });

      if (!response.text) {
        throw new Error("No response generated from AI model");
      }

      const tailoredData = JSON.parse(response.text) as TailoredResume;
      const rawScore = Number(tailoredData.analysis?.matchScore) || 99;
      tailoredData.analysis.matchScore = Math.min(100, Math.max(98, Math.round(rawScore)));

      res.json(tailoredData);
    } catch (error: any) {
      console.error("[/api/gemini/tailor error]:", error);
      const cleaned = cleanErrorMessage(error);
      res.status(error?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
        error: cleaned.message,
        code: error?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
        retrySeconds: error?.retrySeconds || cleaned.retrySeconds
      });
    }
  });

  // 2. Optimize Resume Endpoint
  app.post("/api/gemini/optimize", async (req, res) => {
    try {
      const { currentResume, userPrompt } = req.body as {
        currentResume: TailoredResume;
        userPrompt: string;
      };

      if (!userPrompt?.trim()) {
        res.status(400).json({ error: "Instruction prompt is required" });
        return;
      }

      const systemInstruction = `
    You are an expert resume optimizer.
    Apply the user's instruction to the resume.
    Maintain the exact same JSON schema.
    Do not lose any information unless explicitly asked to remove it.
    CRITICAL: Ensure that all duties under professional experiences remain deeply tailored to the target role and Job Description at a 98 - 100 MATCHING SCORE. Analysis matchScore MUST be strictly between 98 and 100.
    
    CURRENT RESUME:
    ${JSON.stringify(currentResume)}
    `;

      const prompt = `USER INSTRUCTION:\n"${userPrompt}"\n\nReturn the updated resume in the required JSON format, ensuring duties under experiences maintain a 98 - 100 matching score.`;

      const response = await generateWithGemini({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction,
        responseSchema: resumeSchema,
        temperature: 0.35
      });

      if (!response.text) {
        throw new Error("No response generated from AI model");
      }

      const tailoredData = JSON.parse(response.text) as TailoredResume;
      const rawScore = Number(tailoredData.analysis?.matchScore) || 99;
      tailoredData.analysis.matchScore = Math.min(100, Math.max(98, Math.round(rawScore)));

      res.json(tailoredData);
    } catch (error: any) {
      console.error("[/api/gemini/optimize error]:", error);
      const cleaned = cleanErrorMessage(error);
      res.status(error?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
        error: cleaned.message,
        code: error?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
        retrySeconds: error?.retrySeconds || cleaned.retrySeconds
      });
    }
  });

  // 3. Cover Letter Endpoint
  app.post("/api/gemini/cover-letter", async (req, res) => {
    try {
      const { companyName, hiringManager, targetRole, baseResume, jobDescription } = req.body;

      if (!companyName?.trim()) {
        res.status(400).json({ error: "Company name is required" });
        return;
      }

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: "The full markdown formatted cover letter" },
        },
        required: ["content"]
      };

      const systemPrompt = `
    You are an Executive Career Strategist.
    Write a highly tailored Cover Letter.

    TARGET ROLE: ${targetRole}
    COMPANY: ${companyName}
    HIRING MANAGER: ${hiringManager || "Hiring Manager"}

    TONE & STYLE:
    - Confidence without arrogance.
    - Evidence-based statements (cite specific technical wins from the resume).
    - "Hook" opening that addresses the company's specific needs found in the JD.
    - No generic fluff ("I am a hard worker").

    CANDIDATE DATA:
    ${JSON.stringify(baseResume)}

    JOB DESCRIPTION:
    ${jobDescription || "No specific JD provided, focus on general role excellence."}
    `;

      const response = await generateWithGemini({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        responseSchema: schema,
        temperature: 0.4
      });

      if (!response.text) {
        throw new Error("No response generated");
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("[/api/gemini/cover-letter error]:", error);
      const cleaned = cleanErrorMessage(error);
      res.status(error?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
        error: cleaned.message,
        code: error?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
        retrySeconds: error?.retrySeconds || cleaned.retrySeconds
      });
    }
  });

  // 4. Answer Job Application Question Endpoint
  app.post("/api/gemini/answer-question", async (req, res) => {
    try {
      const { question, targetRole, baseResume, wordLimit, jobDescription, jobLink } = req.body;

      if (!question?.trim()) {
        res.status(400).json({ error: "Question is required" });
        return;
      }

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          generated_answer: { type: Type.STRING },
          confidence_note: { type: Type.STRING },
          intent_detected: { type: Type.STRING, description: "Technical, Behavioral, Governance, or Role Fit" }
        },
        required: ["generated_answer", "confidence_note", "intent_detected"]
      };

      const systemPrompt = `
    You are an intelligent Application Question Assistant.
    Answer employer application questions based on candidate profile.

    TARGET ROLE: ${targetRole}
    WORD LIMIT: ${wordLimit ? wordLimit + " words" : "Concise (approx 200 words)"}

    QUESTION:
    ${question}

    CANDIDATE PROFILE:
    ${JSON.stringify(baseResume)}

    JOB CONTEXT:
    ${jobDescription || "Standard role context"}
    ${jobLink ? `JOB LINK: ${jobLink}` : ''}
    `;

      const response = await generateWithGemini({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        responseSchema: schema,
        temperature: 0.3
      });

      if (!response.text) {
        throw new Error("No response generated");
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("[/api/gemini/answer-question error]:", error);
      const cleaned = cleanErrorMessage(error);
      res.status(error?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
        error: cleaned.message,
        code: error?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
        retrySeconds: error?.retrySeconds || cleaned.retrySeconds
      });
    }
  });

  // 5. Parse Resume Text Endpoint
  app.post("/api/gemini/parse-resume", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) {
        res.status(400).json({ error: "Text content is required" });
        return;
      }

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
            required: ["location", "email"]
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
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["company", "role", "duration", "bullets"]
            }
          }
        },
        required: ["name", "contact", "summary", "skills", "experience"]
      };

      const prompt = `
    Extract structured resume data from the text below. 
    Map it strictly to the JSON schema.
    Ensure "bullets" in experience are preserved as individual points from source.
    
    RESUME TEXT:
    ${text}
    `;

      const response = await generateWithGemini({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        responseSchema: parseSchema,
        temperature: 0.2
      });

      if (!response.text) {
        throw new Error("No response generated");
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("[/api/gemini/parse-resume error]:", error);
      const cleaned = cleanErrorMessage(error);
      res.status(error?.code === "QUOTA_EXCEEDED" || cleaned.isQuota ? 429 : 500).json({
        error: cleaned.message,
        code: error?.code || (cleaned.isQuota ? "QUOTA_EXCEEDED" : undefined),
        retrySeconds: error?.retrySeconds || cleaned.retrySeconds
      });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v5, wildcard routing for SPA fallback uses '*all'
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RoleArchitect Server] Running on http://0.0.0.0:${PORT} (Free-tier models active)`);
  });
}

startServer();
