export type CostProfile = 'eco' | 'hybrid';
export type BillingMode = 'free' | 'paid';

export type TaskKey =
  | 'tailor-resume'
  | 'optimize-resume'
  | 'application-answer'
  | 'cover-letter'
  | 'parse-resume'
  | 'gap-analysis';

export type ModelStatus = 'Active Core' | 'Fallback' | 'Retired' | 'Removed' | 'Excluded Paid';

export interface ModelSpec {
  id: string;
  label: string;
  roleSummary: string;
  inputPer1M: number;
  outputPer1M: number;
  cachedPer1M: number | null;
  inputDisplay?: string;
  outputDisplay?: string;
  cachedDisplay?: string;
  thinkingMode: string;
  freeTierEligible: boolean;
  status: ModelStatus;
  pricingNote?: string;
}

export interface TaskRoutingPolicy {
  task: TaskKey;
  label: string;
  shortLabel: string;
  endpoint: string;
  workflowWeight: number;
  baselineInputTokens: number;
  optimizedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedThoughtTokens: Record<CostProfile, number>;
  promptTrimSummary: string;
  chains: Record<CostProfile, readonly string[]>;
}

export interface ModelAllocation {
  modelId: string;
  label: string;
  callsPerMonth: number;
  inputTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  paidCostUsd: number;
}

export interface MonthlyProjection {
  runsPerMonth: number;
  profile: CostProfile;
  baselineMonthlyCostUsd: number;
  optimizedMonthlyCostUsd: number;
  argonBenchmarkMonthlyCostUsd: number;
  savingsVsBaselineUsd: number;
  savingsVsBaselinePct: number;
  savingsVsArgonPct: number;
  baselineInputTokens: number;
  optimizedInputTokens: number;
  inputTokenReductionPct: number;
  totalMonthlyCalls: number;
  allocations: ModelAllocation[];
}

export const MODEL_CATALOG: Record<string, ModelSpec> = {
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    roleSummary: 'Primary workhorse for parse, Q&A, optimize, and Eco tailoring',
    inputPer1M: 0.25,
    outputPer1M: 1.5,
    cachedPer1M: 0.025,
    thinkingMode: 'MINIMAL',
    freeTierEligible: true,
    status: 'Active Core',
  },
  'gemini-4-hydrogen': {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen',
    roleSummary: 'Hybrid synthesis primary for resume tailoring & cover letters',
    inputPer1M: 1.5,
    outputPer1M: 7.5,
    cachedPer1M: 0.075,
    thinkingMode: 'LOW (no sampling params)',
    freeTierEligible: true,
    status: 'Active Core',
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    roleSummary: 'Active Free-Tier resilience fallback (replaces retired gemini-2.5-flash)',
    inputPer1M: 0.75,
    outputPer1M: 3.75,
    cachedPer1M: 0.075,
    thinkingMode: 'LOW',
    freeTierEligible: true,
    status: 'Fallback',
    pricingNote: 'Rates double Jan 1, 2027',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    roleSummary: 'Unavailable to new users (replaced by gemini-3.8-flash)',
    inputPer1M: 0.3,
    outputPer1M: 2.5,
    cachedPer1M: 0.03,
    thinkingMode: 'Retired',
    freeTierEligible: false,
    status: 'Retired',
  },
  'gemini-3.8-live': {
    id: 'gemini-3.8-live',
    label: 'Gemini 3.8 Live',
    roleSummary: 'Unused bidirectional audio WebSocket route (removed)',
    inputPer1M: 3.0,
    outputPer1M: 12.0,
    cachedPer1M: null,
    inputDisplay: '$3.00 audio',
    outputDisplay: '$4.50–$12.00',
    cachedDisplay: 'N/A',
    thinkingMode: 'Removed',
    freeTierEligible: false,
    status: 'Removed',
  },
  'gemini-4-argon': {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon',
    roleSummary: 'Paid-only reference benchmark (excluded from execution)',
    inputPer1M: 2.0,
    outputPer1M: 10.0,
    cachedPer1M: 0.1,
    thinkingMode: 'Excluded',
    freeTierEligible: false,
    status: 'Excluded Paid',
    pricingNote: 'Rates increase Dec 1, 2026',
  },
} as const;

export const MODEL_CATALOG_LIST: readonly ModelSpec[] = [
  MODEL_CATALOG['gemini-3.1-flash-lite'],
  MODEL_CATALOG['gemini-4-hydrogen'],
  MODEL_CATALOG['gemini-3.8-flash'],
  MODEL_CATALOG['gemini-2.5-flash'],
  MODEL_CATALOG['gemini-3.8-live'],
  MODEL_CATALOG['gemini-4-argon'],
];

export const ACTIVE_FREE_TIER_MODEL_IDS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
] as const;

export const TASK_ROUTING_POLICIES: Record<TaskKey, TaskRoutingPolicy> = {
  'tailor-resume': {
    task: 'tailor-resume',
    label: 'Tailor Resume',
    shortLabel: 'Tailor',
    endpoint: '/api/gemini/tailor-resume',
    workflowWeight: 1.0,
    baselineInputTokens: 6400,
    optimizedInputTokens: 1750,
    estimatedOutputTokens: 2600,
    estimatedThoughtTokens: {
      eco: 120,
      hybrid: 380,
    },
    promptTrimSummary: 'Single-role keyed Role Intelligence lookup (-73% prompt overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
    },
  },
  'optimize-resume': {
    task: 'optimize-resume',
    label: 'Optimize Resume',
    shortLabel: 'Optimize',
    endpoint: '/api/gemini/optimize-resume',
    workflowWeight: 0.5,
    baselineInputTokens: 5200,
    optimizedInputTokens: 2100,
    estimatedOutputTokens: 2400,
    estimatedThoughtTokens: {
      eco: 100,
      hybrid: 100,
    },
    promptTrimSummary: 'Focused delta prompt + strict schema preservation (-60% overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    },
  },
  'application-answer': {
    task: 'application-answer',
    label: 'Application Q&A',
    shortLabel: 'Q&A',
    endpoint: '/api/gemini/application-answer',
    workflowWeight: 2.0,
    baselineInputTokens: 4800,
    optimizedInputTokens: 1250,
    estimatedOutputTokens: 320,
    estimatedThoughtTokens: {
      eco: 60,
      hybrid: 60,
    },
    promptTrimSummary: 'Single-role Q&A hint lookup (-74% prompt overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    },
  },
  'cover-letter': {
    task: 'cover-letter',
    label: 'Cover Letter',
    shortLabel: 'Cover Letter',
    endpoint: '/api/gemini/cover-letter',
    workflowWeight: 0.5,
    baselineInputTokens: 4900,
    optimizedInputTokens: 1300,
    estimatedOutputTokens: 680,
    estimatedThoughtTokens: {
      eco: 80,
      hybrid: 240,
    },
    promptTrimSummary: 'Single-role cover letter angle lookup (-73% prompt overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
    },
  },
  'parse-resume': {
    task: 'parse-resume',
    label: 'Parse Resume',
    shortLabel: 'Parse',
    endpoint: '/api/gemini/parse-resume',
    workflowWeight: 0.2,
    baselineInputTokens: 3200,
    optimizedInputTokens: 1600,
    estimatedOutputTokens: 1400,
    estimatedThoughtTokens: {
      eco: 50,
      hybrid: 50,
    },
    promptTrimSummary: 'Compact extraction schema without role catalog (-50% overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    },
  },
  'gap-analysis': {
    task: 'gap-analysis',
    label: 'Gap Analysis',
    shortLabel: 'Gap Audit',
    endpoint: '/api/gemini/gap-analysis',
    workflowWeight: 0.3,
    baselineInputTokens: 4500,
    optimizedInputTokens: 1900,
    estimatedOutputTokens: 650,
    estimatedThoughtTokens: {
      eco: 80,
      hybrid: 80,
    },
    promptTrimSummary: 'Focused JD-vs-Resume diff schema on Flash-Lite (-58% overhead)',
    chains: {
      eco: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
      hybrid: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    },
  },
};

export const TASK_ROUTING_LIST: readonly TaskRoutingPolicy[] = [
  TASK_ROUTING_POLICIES['tailor-resume'],
  TASK_ROUTING_POLICIES['optimize-resume'],
  TASK_ROUTING_POLICIES['application-answer'],
  TASK_ROUTING_POLICIES['cover-letter'],
  TASK_ROUTING_POLICIES['parse-resume'],
  TASK_ROUTING_POLICIES['gap-analysis'],
];

export function normalizeCostProfile(value: unknown): CostProfile {
  return value === 'hybrid' ? 'hybrid' : 'eco';
}

export function getTaskModelChain(task: TaskKey, profile: CostProfile): readonly string[] {
  return TASK_ROUTING_POLICIES[task].chains[profile];
}

export function estimateTokenCostUsd(
  modelId: string,
  promptTokens: number,
  candidatesTokens: number,
  thoughtsTokens = 0,
  cachedTokens = 0
): number {
  const spec = MODEL_CATALOG[modelId] ?? MODEL_CATALOG['gemini-3.1-flash-lite'];
  const billableInputTokens = Math.max(0, promptTokens - cachedTokens);
  const billableOutputTokens = Math.max(0, candidatesTokens) + Math.max(0, thoughtsTokens);

  const inputCost = (billableInputTokens / 1_000_000) * spec.inputPer1M;
  const cachedCost =
    cachedTokens > 0 && spec.cachedPer1M !== null
      ? (cachedTokens / 1_000_000) * spec.cachedPer1M
      : 0;
  const outputCost = (billableOutputTokens / 1_000_000) * spec.outputPer1M;

  return inputCost + cachedCost + outputCost;
}

export function getTaskPromptTrimPct(policy: TaskRoutingPolicy): number {
  if (policy.baselineInputTokens <= 0) return 0;
  return Math.round(
    ((policy.baselineInputTokens - policy.optimizedInputTokens) / policy.baselineInputTokens) * 100
  );
}

export function estimateTaskSingleRunCostUsd(
  task: TaskKey,
  profile: CostProfile
): number {
  const policy = TASK_ROUTING_POLICIES[task];
  const primaryModel = policy.chains[profile][0];
  return estimateTokenCostUsd(
    primaryModel,
    policy.optimizedInputTokens,
    policy.estimatedOutputTokens,
    policy.estimatedThoughtTokens[profile]
  );
}

export function calculateMonthlyProjection(
  runsPerMonth: number,
  profile: CostProfile
): MonthlyProjection {
  const safeRuns = Math.max(1, Math.round(runsPerMonth));
  let baselineMonthlyCostUsd = 0;
  let optimizedMonthlyCostUsd = 0;
  let argonBenchmarkMonthlyCostUsd = 0;
  let baselineInputTokens = 0;
  let optimizedInputTokens = 0;
  let totalMonthlyCalls = 0;

  const allocationMap = new Map<string, ModelAllocation>();

  for (const policy of TASK_ROUTING_LIST) {
    const monthlyCalls = safeRuns * policy.workflowWeight;
    totalMonthlyCalls += monthlyCalls;

    const baseIn = monthlyCalls * policy.baselineInputTokens;
    const optIn = monthlyCalls * policy.optimizedInputTokens;
    const outTokens = monthlyCalls * policy.estimatedOutputTokens;
    const optThoughts = monthlyCalls * policy.estimatedThoughtTokens[profile];
    const baselineThoughts = monthlyCalls * 250;

    baselineInputTokens += baseIn;
    optimizedInputTokens += optIn;

    baselineMonthlyCostUsd += estimateTokenCostUsd(
      'gemini-3.8-flash',
      baseIn,
      outTokens,
      baselineThoughts
    );

    argonBenchmarkMonthlyCostUsd += estimateTokenCostUsd(
      'gemini-4-argon',
      baseIn,
      outTokens,
      baselineThoughts
    );

    const primaryModelId = policy.chains[profile][0];
    const taskOptCost = estimateTokenCostUsd(
      primaryModelId,
      optIn,
      outTokens,
      optThoughts
    );
    optimizedMonthlyCostUsd += taskOptCost;

    const existing = allocationMap.get(primaryModelId);
    if (existing) {
      existing.callsPerMonth += monthlyCalls;
      existing.inputTokens += optIn;
      existing.outputTokens += outTokens;
      existing.thoughtTokens += optThoughts;
      existing.paidCostUsd += taskOptCost;
    } else {
      const spec = MODEL_CATALOG[primaryModelId];
      allocationMap.set(primaryModelId, {
        modelId: primaryModelId,
        label: spec?.label ?? primaryModelId,
        callsPerMonth: monthlyCalls,
        inputTokens: optIn,
        outputTokens: outTokens,
        thoughtTokens: optThoughts,
        paidCostUsd: taskOptCost,
      });
    }
  }

  const savingsVsBaselineUsd = Math.max(0, baselineMonthlyCostUsd - optimizedMonthlyCostUsd);
  const savingsVsBaselinePct =
    baselineMonthlyCostUsd > 0 ? (savingsVsBaselineUsd / baselineMonthlyCostUsd) * 100 : 0;
  const savingsVsArgonPct =
    argonBenchmarkMonthlyCostUsd > 0
      ? ((argonBenchmarkMonthlyCostUsd - optimizedMonthlyCostUsd) / argonBenchmarkMonthlyCostUsd) *
        100
      : 0;
  const inputTokenReductionPct =
    baselineInputTokens > 0
      ? ((baselineInputTokens - optimizedInputTokens) / baselineInputTokens) * 100
      : 0;

  return {
    runsPerMonth: safeRuns,
    profile,
    baselineMonthlyCostUsd,
    optimizedMonthlyCostUsd,
    argonBenchmarkMonthlyCostUsd,
    savingsVsBaselineUsd,
    savingsVsBaselinePct,
    savingsVsArgonPct,
    baselineInputTokens,
    optimizedInputTokens,
    inputTokenReductionPct,
    totalMonthlyCalls,
    allocations: Array.from(allocationMap.values()),
  };
}
