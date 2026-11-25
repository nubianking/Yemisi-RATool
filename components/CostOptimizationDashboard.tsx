import React, { useEffect, useMemo, useState } from 'react';
import {
  BillingMode,
  CostProfile,
  MODEL_CATALOG_LIST,
  ModelStatus,
  TASK_ROUTING_LIST,
  TaskKey,
  calculateMonthlyProjection,
  estimateTaskSingleRunCostUsd,
  getTaskPromptTrimPct,
} from '../costCatalog';
import {
  USAGE_UPDATED_EVENT,
  clearUsageHistory,
  getUsageHistory,
} from '../services/geminiService';
import { UsageRecord } from '../types';

interface CostOptimizationDashboardProps {
  costProfile: CostProfile;
  onChangeCostProfile: (profile: CostProfile) => void;
}

const RUN_PRESETS = [100, 250, 500] as const;

const TASK_FILTERS: { key: 'all' | TaskKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tailor-resume', label: 'Tailor' },
  { key: 'optimize-resume', label: 'Optimize' },
  { key: 'application-answer', label: 'Q&A' },
  { key: 'cover-letter', label: 'Cover Letter' },
  { key: 'parse-resume', label: 'Parse' },
  { key: 'gap-analysis', label: 'Gap Audit' },
];

function formatUsd(amount: number, decimals = 2): string {
  if (amount > 0 && amount < 0.005 && decimals === 2) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(decimals)}`;
}

function formatCompactTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

function formatStatusColor(status: ModelStatus): string {
  switch (status) {
    case 'Active Core':
      return 'text-emerald-400';
    case 'Fallback':
      return 'text-neutral-200';
    case 'Retired':
      return 'text-amber-400';
    case 'Removed':
      return 'text-neutral-500';
    case 'Excluded Paid':
      return 'text-red-400';
    default:
      return 'text-neutral-400';
  }
}

export const CostOptimizationDashboard: React.FC<CostOptimizationDashboardProps> = ({
  costProfile,
  onChangeCostProfile,
}) => {
  const [runsPerMonth, setRunsPerMonth] = useState<number>(250);
  const [billingMode, setBillingMode] = useState<BillingMode>('free');
  const [taskFilter, setTaskFilter] = useState<'all' | TaskKey>('all');
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>(() => getUsageHistory());

  useEffect(() => {
    const syncUsage = () => setUsageRecords(getUsageHistory());
    window.addEventListener(USAGE_UPDATED_EVENT, syncUsage);
    window.addEventListener('storage', syncUsage);
    return () => {
      window.removeEventListener(USAGE_UPDATED_EVENT, syncUsage);
      window.removeEventListener('storage', syncUsage);
    };
  }, []);

  const projection = useMemo(
    () => calculateMonthlyProjection(runsPerMonth, costProfile),
    [runsPerMonth, costProfile]
  );

  const sessionStats = useMemo(() => {
    return usageRecords.reduce(
      (acc, record) => {
        acc.totalCalls += 1;
        acc.totalTokens += record.totalTokenCount;
        acc.totalCostUsd += record.estimatedCostUsd;
        return acc;
      },
      { totalCalls: 0, totalTokens: 0, totalCostUsd: 0 }
    );
  }, [usageRecords]);

  const filteredUsage = useMemo(() => {
    if (taskFilter === 'all') return usageRecords;
    return usageRecords.filter((rec) => rec.task === taskFilter);
  }, [usageRecords, taskFilter]);

  const activeCoreModelsCount = costProfile === 'eco' ? '1 + 2 Fallback' : '2 + 1 Fallback';
  const displayedMonthlySpend =
    billingMode === 'free' ? 0 : projection.optimizedMonthlyCostUsd;
  const maxBarCost = Math.max(
    projection.argonBenchmarkMonthlyCostUsd,
    projection.baselineMonthlyCostUsd,
    projection.optimizedMonthlyCostUsd,
    0.01
  );

  const handleClearLedger = () => {
    clearUsageHistory();
    setUsageRecords([]);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10">
      {/* Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Cost Optimization & Model Routing
          </h2>
          <p className="text-xs text-neutral-400">
            Free-Tier eligible routing · Single-role prompt lookup · Real-time token ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Routing Profile Segmented Toggle */}
          <div
            className="inline-flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded"
            role="group"
            aria-label="Routing profile"
          >
            <button
              type="button"
              onClick={() => onChangeCostProfile('eco')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                costProfile === 'eco'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Flash-Lite Eco
            </button>
            <button
              type="button"
              onClick={() => onChangeCostProfile('hybrid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                costProfile === 'hybrid'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hybrid Lite + Hydrogen
            </button>
          </div>

          {/* Billing Mode Segmented Toggle */}
          <div
            className="inline-flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded"
            role="group"
            aria-label="Billing mode"
          >
            <button
              type="button"
              onClick={() => setBillingMode('free')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                billingMode === 'free'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Free Tier
            </button>
            <button
              type="button"
              onClick={() => setBillingMode('paid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                billingMode === 'paid'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Pay-As-You-Go
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <section aria-label="Key cost metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-neutral-800 bg-neutral-950 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
        <div className="p-5 space-y-1.5">
          <div className="text-xs text-neutral-400">Models Required</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">
            {activeCoreModelsCount}
          </div>
          <div className="text-xs text-neutral-500">
            Free-Tier text/JSON only · Live removed
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="text-xs text-neutral-400">
            Monthly Spend ({runsPerMonth} runs)
          </div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">
            {formatUsd(displayedMonthlySpend)}
          </div>
          <div className="text-xs text-neutral-500 font-mono tabular-nums">
            {billingMode === 'free'
              ? `Pay-as-you-go equiv. ${formatUsd(projection.optimizedMonthlyCostUsd)}/mo`
              : `-${projection.savingsVsBaselinePct.toFixed(0)}% vs 3.8 Flash baseline`}
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="text-xs text-neutral-400">Input Token Reduction</div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums">
            -{projection.inputTokenReductionPct.toFixed(1)}%
          </div>
          <div className="text-xs text-neutral-500 font-mono tabular-nums">
            {formatCompactTokens(projection.optimizedInputTokens)} vs{' '}
            {formatCompactTokens(projection.baselineInputTokens)} / mo
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="text-xs text-neutral-400">Tracked Session Spend</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">
            {billingMode === 'free' ? '$0.00' : formatUsd(sessionStats.totalCostUsd, 4)}
          </div>
          <div className="text-xs text-neutral-500 font-mono tabular-nums">
            {sessionStats.totalCalls} calls · {formatCompactTokens(sessionStats.totalTokens)} tokens
            {billingMode === 'free' && sessionStats.totalCostUsd > 0
              ? ` · ${formatUsd(sessionStats.totalCostUsd, 4)} list`
              : ''}
          </div>
        </div>
      </section>

      {/* Monthly Volume & Cost Simulator */}
      <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Monthly Volume & Cost Simulator
            </h3>
            <p className="text-xs text-neutral-400">
              Workflow weighting per run: 1.0 Tailor · 0.5 Optimize · 2.0 Q&A · 0.5 Cover Letter · 0.2 Parse ({Math.round(projection.totalMonthlyCalls)} API calls/mo)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {RUN_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRunsPerMonth(preset)}
                className={`px-3 py-1.5 text-xs font-mono tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  runsPerMonth === preset
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {preset} runs
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Monthly workflow runs</span>
            <span className="font-mono tabular-nums text-white font-semibold">
              {runsPerMonth} runs / month
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={500}
            step={10}
            value={runsPerMonth}
            onChange={(e) => setRunsPerMonth(Number(e.target.value))}
            aria-label="Monthly workflow runs"
            className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-none"
          />
          <div className="flex justify-between text-[11px] font-mono tabular-nums text-neutral-500">
            <span>100</span>
            <span>200</span>
            <span>300</span>
            <span>400</span>
            <span>500</span>
          </div>
        </div>

        {/* Comparison Bars */}
        <div className="pt-4 border-t border-neutral-800 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white font-medium">
                Active Optimized ({costProfile === 'eco' ? 'Flash-Lite Eco' : 'Hybrid Lite + Hydrogen'})
              </span>
              <span className="font-mono tabular-nums text-emerald-400">
                {billingMode === 'free'
                  ? `$0.00 Free Tier (${formatUsd(projection.optimizedMonthlyCostUsd)} PAYG)`
                  : `${formatUsd(projection.optimizedMonthlyCostUsd)} / mo (-${projection.savingsVsBaselinePct.toFixed(0)}% vs baseline)`}
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.max(
                    3,
                    (projection.optimizedMonthlyCostUsd / maxBarCost) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300">
                Legacy Baseline (Untrimmed Gemini 3.8 Flash)
              </span>
              <span className="font-mono tabular-nums text-neutral-300">
                {formatUsd(projection.baselineMonthlyCostUsd)} / mo
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-neutral-500 transition-all duration-200"
                style={{
                  width: `${Math.max(
                    3,
                    (projection.baselineMonthlyCostUsd / maxBarCost) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">
                Excluded Paid Benchmark (Gemini 4 Argon)
              </span>
              <span className="font-mono tabular-nums text-neutral-400">
                {formatUsd(projection.argonBenchmarkMonthlyCostUsd)} / mo (-{projection.savingsVsArgonPct.toFixed(0)}% saved)
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-neutral-700 transition-all duration-200"
                style={{
                  width: `${Math.max(
                    3,
                    (projection.argonBenchmarkMonthlyCostUsd / maxBarCost) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Per-Model Monthly Allocation Table */}
        <div className="pt-4 border-t border-neutral-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2.5 pr-4 font-medium">Primary Model Allocation</th>
                <th className="py-2.5 px-4 font-medium text-right">Calls / Mo</th>
                <th className="py-2.5 px-4 font-medium text-right">Input Tokens</th>
                <th className="py-2.5 px-4 font-medium text-right">Output + Thinking</th>
                <th className="py-2.5 pl-4 font-medium text-right">
                  {billingMode === 'free' ? 'Free Tier / PAYG Ref' : 'Projected Spend'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {projection.allocations.map((row) => (
                <tr key={row.modelId} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <span className="text-white font-medium">{row.label}</span>
                    <span className="text-neutral-500 ml-2 font-mono">{row.modelId}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-200">
                    {Math.round(row.callsPerMonth).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-300">
                    {formatCompactTokens(row.inputTokens)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-300">
                    {formatCompactTokens(row.outputTokens + row.thoughtTokens)}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-white">
                    {billingMode === 'free'
                      ? `$0.00 / ${formatUsd(row.paidCostUsd)}`
                      : formatUsd(row.paidCostUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Models Needed & Cost Per Model Table */}
      <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            Models Needed & Cost Per Model
          </h3>
          <p className="text-xs text-neutral-400">
            Per-1M-token USD pricing · Thinking tokens billed at output rate · Paid-only models excluded from execution
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2.5 pr-4 font-medium">Model</th>
                <th className="py-2.5 px-3 font-medium text-right">Input / 1M</th>
                <th className="py-2.5 px-3 font-medium text-right">Output / 1M</th>
                <th className="py-2.5 px-3 font-medium text-right">Cached / 1M</th>
                <th className="py-2.5 px-3 font-medium">Thinking Mode</th>
                <th className="py-2.5 pl-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {MODEL_CATALOG_LIST.map((model) => (
                <tr key={model.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-mono text-white font-medium">{model.id}</div>
                    <div className="text-neutral-500 mt-0.5">
                      {model.roleSummary}
                      {model.pricingNote ? ` · ${model.pricingNote}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-200 whitespace-nowrap">
                    {model.inputDisplay ?? `$${model.inputPer1M.toFixed(2)}`}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-200 whitespace-nowrap">
                    {model.outputDisplay ?? `$${model.outputPer1M.toFixed(2)}`}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                    {model.cachedDisplay ??
                      (model.cachedPer1M !== null ? `$${model.cachedPer1M.toFixed(3)}` : 'N/A')}
                  </td>
                  <td className="py-3 px-3 text-neutral-300 font-mono whitespace-nowrap">
                    {model.thinkingMode}
                  </td>
                  <td className="py-3 pl-3 text-right whitespace-nowrap">
                    <span className={`font-medium ${formatStatusColor(model.status)}`}>
                      {model.status}
                    </span>
                    <span className="text-neutral-600 ml-1.5">
                      / {model.freeTierEligible ? 'Free Tier' : 'Paid / Off'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Endpoint Routing & Prompt Optimization Audit */}
      <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            Endpoint Routing & Prompt Optimization Audit
          </h3>
          <p className="text-xs text-neutral-400">
            Active cascade for {costProfile === 'eco' ? 'Flash-Lite Eco' : 'Hybrid Lite + Hydrogen'} · Single-role lookup replaces monolithic role catalog
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2.5 pr-4 font-medium">Endpoint</th>
                <th className="py-2.5 px-3 font-medium">Primary → Fallback Chain</th>
                <th className="py-2.5 px-3 font-medium text-right">Prompt Trim</th>
                <th className="py-2.5 px-3 font-medium text-right">Est. In / Out</th>
                <th className="py-2.5 pl-3 font-medium text-right">Single-Run Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {TASK_ROUTING_LIST.map((policy) => {
                const trimPct = getTaskPromptTrimPct(policy);
                const runCost = estimateTaskSingleRunCostUsd(policy.task, costProfile);
                const chain = policy.chains[costProfile];
                return (
                  <tr key={policy.task} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">{policy.label}</div>
                      <div className="text-neutral-500 font-mono mt-0.5">{policy.endpoint}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">
                      <span className="text-white font-medium">{chain[0]}</span>
                      <span className="text-neutral-500"> → {chain.slice(1).join(' → ')}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                      -{trimPct}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                      {policy.optimizedInputTokens.toLocaleString()} / {policy.estimatedOutputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-white whitespace-nowrap">
                      {billingMode === 'free'
                        ? `$0.00 (${formatUsd(runCost, 4)})`
                        : formatUsd(runCost, 4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Session Token Telemetry */}
      <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Live Session Token Telemetry
            </h3>
            <p className="text-xs text-neutral-400">
              Actual usageMetadata captured from server Gemini calls (last 100 requests stored locally)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded">
              {TASK_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTaskFilter(filter.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                    taskFilter === filter.key
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearLedger}
              disabled={usageRecords.length === 0}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              Clear Ledger
            </button>
          </div>
        </div>

        {filteredUsage.length === 0 ? (
          <div className="py-10 text-center border-t border-neutral-800 space-y-1.5">
            <p className="text-sm text-neutral-300">
              {usageRecords.length === 0
                ? 'No token telemetry recorded yet in this session.'
                : 'No requests match the selected task filter.'}
            </p>
            <p className="text-xs text-neutral-500">
              Generate a tailored resume, optimize bullets, draft a cover letter, or answer an HR question to inspect live token counts and model routing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-neutral-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 pr-3 font-medium">Time</th>
                  <th className="py-2.5 px-3 font-medium">Task</th>
                  <th className="py-2.5 px-3 font-medium">Model / Profile</th>
                  <th className="py-2.5 px-3 font-medium text-right">Prompt</th>
                  <th className="py-2.5 px-3 font-medium text-right">Output</th>
                  <th className="py-2.5 px-3 font-medium text-right">Thinking</th>
                  <th className="py-2.5 px-3 font-medium text-right">Latency</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredUsage.map((rec) => (
                  <tr key={rec.id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-white font-medium">{rec.task}</span>
                      {rec.targetRole && (
                        <span className="text-neutral-500"> · {rec.targetRole}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                      {rec.model}
                      <span className="text-neutral-500"> / {rec.costProfile}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-300">
                      {rec.promptTokenCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-300">
                      {rec.candidatesTokenCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-400">
                      {rec.thoughtsTokenCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                      {(rec.latencyMs / 1000).toFixed(2)}s
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-white whitespace-nowrap">
                      {billingMode === 'free'
                        ? `$0.00 (${formatUsd(rec.estimatedCostUsd, 4)})`
                        : formatUsd(rec.estimatedCostUsd, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
