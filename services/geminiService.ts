import {
  ResumeData,
  TargetRole,
  TailoredResume,
  UsageMetadata,
  UsageRecord,
  GapAnalysisResult,
} from '../types';
import { CostProfile, normalizeCostProfile } from '../costCatalog';

export interface ApplicationAnswerResponse {
  generated_answer: string;
  confidence_note: string;
  intent_detected: string;
  _usage?: UsageMetadata;
}

export interface CoverLetterResponse {
  content: string;
  _usage?: UsageMetadata;
}

const COST_PROFILE_STORAGE_KEY = 'role_architect_cost_profile';
const USAGE_LEDGER_STORAGE_KEY = 'role_architect_usage_ledger';
const MAX_USAGE_RECORDS = 100;

export const USAGE_UPDATED_EVENT = 'role-architect-usage-updated';
export const COST_PROFILE_UPDATED_EVENT = 'role-architect-cost-profile-updated';

export function getCostProfile(): CostProfile {
  try {
    return normalizeCostProfile(localStorage.getItem(COST_PROFILE_STORAGE_KEY));
  } catch {
    return 'eco';
  }
}

export function setCostProfile(profile: CostProfile): CostProfile {
  const normalized = normalizeCostProfile(profile);
  try {
    localStorage.setItem(COST_PROFILE_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COST_PROFILE_UPDATED_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function getUsageHistory(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(USAGE_LEDGER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearUsageHistory(): void {
  try {
    localStorage.removeItem(USAGE_LEDGER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT));
  }
}

function recordUsageMetadata(usage: UsageMetadata | undefined, targetRole?: string): void {
  if (!usage) return;
  const entry: UsageRecord = {
    ...usage,
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    targetRole,
  };

  try {
    const existing = getUsageHistory();
    const updated = [entry, ...existing].slice(0, MAX_USAGE_RECORDS);
    localStorage.setItem(USAGE_LEDGER_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT, { detail: entry }));
  }
}

async function handleApiResponse<T extends { _usage?: UsageMetadata }>(
  response: Response,
  defaultErrorMessage: string,
  targetRole?: string
): Promise<Omit<T, '_usage'>> {
  if (!response.ok) {
    let errorDetail = defaultErrorMessage;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || defaultErrorMessage;
      if (typeof errorDetail === 'string' && errorDetail.trim().startsWith('{')) {
        try {
          const inner = JSON.parse(errorDetail);
          if (inner.error?.message) {
            errorDetail = inner.error.message;
          }
        } catch {
          // Ignore nested JSON parsing errors
        }
      }
    } catch {
      errorDetail = `${defaultErrorMessage} (${response.status} ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }

  const payload = (await response.json()) as T;
  if (payload && typeof payload === 'object' && '_usage' in payload) {
    recordUsageMetadata(payload._usage, targetRole);
    const { _usage: _ignored, ...cleanPayload } = payload;
    return cleanPayload as Omit<T, '_usage'>;
  }

  return payload as Omit<T, '_usage'>;
}

export const generateTailoredResume = async (
  jobDescription: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobLink?: string
): Promise<TailoredResume> => {
  const response = await fetch('/api/gemini/tailor-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobDescription,
      targetRole,
      baseResume,
      jobLink,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<TailoredResume>(
    response,
    'Failed to generate tailored resume',
    targetRole
  );
};

export const optimizeTailoredResume = async (
  currentResume: TailoredResume,
  userPrompt: string
): Promise<TailoredResume> => {
  const response = await fetch('/api/gemini/optimize-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentResume,
      userPrompt,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<TailoredResume>(
    response,
    'Failed to optimize resume'
  );
};

export const generateApplicationAnswer = async (
  question: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  wordLimit?: number,
  jobDescription?: string,
  jobLink?: string
): Promise<ApplicationAnswerResponse> => {
  const response = await fetch('/api/gemini/application-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      targetRole,
      baseResume,
      wordLimit,
      jobDescription,
      jobLink,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<ApplicationAnswerResponse>(
    response,
    'Failed to generate application answer',
    targetRole
  );
};

export const generateCoverLetter = async (
  companyName: string,
  hiringManager: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobDescription?: string
): Promise<CoverLetterResponse> => {
  const response = await fetch('/api/gemini/cover-letter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyName,
      hiringManager,
      targetRole,
      baseResume,
      jobDescription,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<CoverLetterResponse>(
    response,
    'Failed to generate cover letter',
    targetRole
  );
};

export const parseResumeFromText = async (text: string): Promise<ResumeData> => {
  const response = await fetch('/api/gemini/parse-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<ResumeData & { _usage?: UsageMetadata }>(
    response,
    'Failed to parse resume text'
  );
};

export const runGapAnalysis = async (
  jobDescription: string,
  tailoredResume: TailoredResume,
  targetRole: TargetRole
): Promise<GapAnalysisResult> => {
  const response = await fetch('/api/gemini/gap-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobDescription,
      tailoredResume,
      targetRole,
      costProfile: getCostProfile(),
    }),
  });

  return handleApiResponse<GapAnalysisResult>(
    response,
    'Failed to run AI gap analysis',
    targetRole
  );
};
