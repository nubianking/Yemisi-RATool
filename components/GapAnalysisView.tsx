import React, { useMemo, useState } from 'react';
import { GapAnalysisResult, TailoredResume, TargetRole } from '../types';
import {
  GapCategory,
  GapStatus,
  analyzeResumeGaps,
} from '../utils/gapAnalyzer';
import { runGapAnalysis } from '../services/geminiService';
import { Button } from './Button';

interface GapAnalysisViewProps {
  tailoredResume: TailoredResume;
  jobDescription: string;
  targetRole: TargetRole;
  onApplyGaps?: (prompt: string) => Promise<void>;
}

type StatusFilter = 'all' | GapStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All Terms' },
  { key: 'Missing', label: 'Missing' },
  { key: 'Under-represented', label: 'Skills Only' },
  { key: 'Covered', label: 'Covered' },
];

export const GapAnalysisView: React.FC<GapAnalysisViewProps> = ({
  tailoredResume,
  jobDescription,
  targetRole,
  onApplyGaps,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | GapCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  // Deep AI Semantic Gap Audit state
  const [aiAudit, setAiAudit] = useState<GapAnalysisResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Applying selected missing keywords into the tailored resume
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccessCount, setApplySuccessCount] = useState<number | null>(null);

  const report = useMemo(
    () => analyzeResumeGaps(jobDescription, tailoredResume),
    [jobDescription, tailoredResume]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return report.items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (
        q &&
        !item.term.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q) &&
        !item.reason.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.items, statusFilter, categoryFilter, searchQuery]);

  const toggleTerm = (term: string) => {
    setApplySuccessCount(null);
    setSelectedTerms((prev) =>
      prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]
    );
  };

  const selectAllMissing = () => {
    setApplySuccessCount(null);
    const missing = report.items
      .filter((i) => i.status === 'Missing')
      .map((i) => i.term);
    const aiMissing = (aiAudit?.missingKeywords || []).map((k) => k.term);
    setSelectedTerms(Array.from(new Set([...missing, ...aiMissing])));
  };

  const selectCriticalMissing = () => {
    setApplySuccessCount(null);
    const critical = report.items
      .filter((i) => i.status === 'Missing' && i.priority === 'Critical')
      .map((i) => i.term);
    const aiCritical = (aiAudit?.missingKeywords || [])
      .filter((k) => k.priority === 'Critical' || k.priority === 'High')
      .map((k) => k.term);
    setSelectedTerms(Array.from(new Set([...critical, ...aiCritical])));
  };

  const handleRunDeepAudit = async () => {
    if (!jobDescription.trim()) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const result = await runGapAnalysis(jobDescription, tailoredResume, targetRole);
      setAiAudit(result);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Failed to run deep AI gap analysis.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplySelectedGaps = async () => {
    if (!onApplyGaps || selectedTerms.length === 0) return;
    setIsApplying(true);
    setApplyError(null);
    setApplySuccessCount(null);

    const termsList = selectedTerms.join(', ');
    const prompt = `Integrate the following missing or under-represented job description keywords and critical skills organically into the tailored resume: ${termsList}.
- Weave every listed term into relevant Technical Skills groupings AND into concrete, quantified Experience bullet points (using exact JD phrasing) while keeping factual companies and dates unchanged.
- Strictly maintain 5 years of Cloud Engineering experience and NEVER use "Senior" or "Sr." in any role title or summary.`;

    try {
      await onApplyGaps(prompt);
      setApplySuccessCount(selectedTerms.length);
      setSelectedTerms([]);
      setAiAudit(null);
    } catch (err: unknown) {
      setApplyError(
        err instanceof Error ? err.message : 'Failed to update tailored resume with selected skills.'
      );
    } finally {
      setIsApplying(false);
    }
  };

  if (!jobDescription.trim()) {
    return (
      <div className="max-w-4xl mx-auto border border-neutral-800 bg-neutral-950 p-10 text-center space-y-2 print:hidden">
        <h3 className="text-base font-semibold text-white">No Job Description Available</h3>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Paste a target job description in the left panel to compare your tailored resume against exact JD keywords and critical skills.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:hidden">
      {/* Header & Deep AI Audit Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-neutral-800">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            JD vs. Tailored Resume Gap Analysis
          </h3>
          <p className="text-xs text-neutral-400">
            Instant keyword diff across Summary, Skills, Certifications, and Experience · Select missing terms to inject into your resume
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleRunDeepAudit}
          disabled={isAuditing}
          className="!py-2 !px-4 !text-xs whitespace-nowrap shrink-0"
        >
          {isAuditing ? 'Running Deep AI Audit...' : aiAudit ? 'Re-run Deep AI Audit' : 'Run Deep AI Gap Audit'}
        </Button>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <section
        aria-label="Gap analysis metrics"
        className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-800 bg-neutral-950 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800"
      >
        <div className="p-4 space-y-1">
          <div className="text-xs text-neutral-400">Keyword Coverage</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-white">
            {report.coveragePct}%
          </div>
          <div className="text-xs text-neutral-500 font-mono tabular-nums">
            {report.coveredCount} of {report.totalJdTerms} JD terms proven
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-neutral-400">Missing Critical</div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums ${
              report.missingCriticalCount > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {report.missingCriticalCount}
          </div>
          <div className="text-xs text-neutral-500">
            {report.missingCriticalCount > 0
              ? 'High-priority JD requirements absent'
              : 'All critical terms matched'}
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-neutral-400">Missing Total</div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums ${
              report.missingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {report.missingCount}
          </div>
          <div className="text-xs text-neutral-500">
            Absent from tailored resume
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-neutral-400">Skills-Only (Unproven)</div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums ${
              report.underrepresentedCount > 0 ? 'text-amber-300' : 'text-neutral-300'
            }`}
          >
            {report.underrepresentedCount}
          </div>
          <div className="text-xs text-neutral-500">
            In Skills, missing in Experience
          </div>
        </div>
      </section>

      {/* Apply Success / Error Banners */}
      {applySuccessCount !== null && (
        <div className="p-4 border border-emerald-800/70 bg-emerald-950/30 text-xs text-emerald-300 flex items-center justify-between gap-4">
          <span>
            Updated your tailored resume with <span className="font-mono font-semibold">{applySuccessCount}</span> gap {applySuccessCount === 1 ? 'keyword' : 'keywords'}. Coverage metrics below reflect the updated CV.
          </span>
          <button
            type="button"
            onClick={() => setApplySuccessCount(null)}
            className="text-neutral-400 hover:text-white whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {(auditError || applyError) && (
        <div className="p-4 border border-red-800/70 bg-red-950/30 text-xs text-red-200 flex items-center justify-between gap-4">
          <span>{applyError || auditError}</span>
          <button
            type="button"
            onClick={() => {
              setAuditError(null);
              setApplyError(null);
            }}
            className="text-neutral-400 hover:text-white whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selected Gaps Action Bar */}
      {selectedTerms.length > 0 && onApplyGaps && (
        <div className="p-4 border border-neutral-700 bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-semibold text-white font-mono tabular-nums">
              {selectedTerms.length} {selectedTerms.length === 1 ? 'skill' : 'skills'} queued for injection
            </div>
            <p className="text-xs text-neutral-400 truncate">
              {selectedTerms.join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTerms([])}
              disabled={isApplying}
              className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Clear
            </button>
            <Button
              onClick={handleApplySelectedGaps}
              disabled={isApplying}
              className="!py-2 !px-4 !text-xs whitespace-nowrap shrink-0"
            >
              {isApplying
                ? 'Updating Tailored Resume...'
                : `Add ${selectedTerms.length} to Tailored Resume`}
            </Button>
          </div>
        </div>
      )}

      {/* Optional Deep AI Semantic Gap Audit Panel */}
      {aiAudit && (
        <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">
                Deep AI Semantic Gap Audit
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {aiAudit.executiveSummary}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-semibold font-mono tabular-nums text-white">
                {aiAudit.overallCoverageScore}%
              </div>
              <div className="text-[11px] text-neutral-500">Semantic Readiness</div>
            </div>
          </div>

          {aiAudit.missingKeywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 pr-3 font-medium w-8">Add</th>
                    <th className="py-2 px-3 font-medium">Missing Keyword / Skill</th>
                    <th className="py-2 px-3 font-medium">Priority / Section</th>
                    <th className="py-2 pl-3 font-medium">JD Evidence & Actionable Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {aiAudit.missingKeywords.map((item, idx) => {
                    const isChecked = selectedTerms.includes(item.term);
                    return (
                      <tr key={`${item.term}-${idx}`} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="py-3 pr-3 align-top">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTerm(item.term)}
                            aria-label={`Select ${item.term}`}
                            className="accent-white cursor-pointer mt-0.5"
                          />
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="text-white font-medium">{item.term}</div>
                          <div className="text-neutral-500 mt-0.5">{item.category}</div>
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <span
                            className={
                              item.priority === 'Critical'
                                ? 'text-red-400 font-medium'
                                : item.priority === 'High'
                                  ? 'text-amber-400 font-medium'
                                  : 'text-neutral-300'
                            }
                          >
                            {item.priority}
                          </span>
                          <span className="text-neutral-600"> · {item.suggestedPlacement}</span>
                        </td>
                        <td className="py-3 pl-3 align-top space-y-1">
                          <div className="text-neutral-400">JD: {item.jdEvidence}</div>
                          <div className="text-neutral-200">{item.actionTip}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-emerald-400">
              No critical semantic gaps detected by the AI audit.
            </p>
          )}

          {aiAudit.underrepresentedSkills.length > 0 && (
            <div className="pt-4 border-t border-neutral-800 space-y-2.5">
              <h5 className="text-xs font-semibold text-neutral-300">
                Under-represented Competencies to Strengthen
              </h5>
              <div className="divide-y divide-neutral-900 border-t border-neutral-900">
                {aiAudit.underrepresentedSkills.map((u, idx) => {
                  const isChecked = selectedTerms.includes(u.term);
                  return (
                    <div key={`${u.term}-${idx}`} className="py-2.5 flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTerm(u.term)}
                        aria-label={`Select ${u.term}`}
                        className="accent-white cursor-pointer mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <div>
                          <span className="text-white font-medium">{u.term}</span>
                          <span className="text-neutral-500"> · Found in {u.currentLocation}</span>
                        </div>
                        <p className="text-neutral-400">{u.recommendation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Deterministic Keyword & Skill Comparison Matrix */}
      <section className="border border-neutral-800 bg-neutral-950 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Keyword & Critical Skill Comparison Matrix
            </h4>
            <p className="text-xs text-neutral-400 font-mono tabular-nums">
              Showing {filteredItems.length} of {report.totalJdTerms} detected JD requirements
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {report.missingCriticalCount > 0 && (
              <button
                type="button"
                onClick={selectCriticalMissing}
                className="px-3 py-1.5 text-xs border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors whitespace-nowrap shrink-0"
              >
                Select Critical ({report.missingCriticalCount})
              </button>
            )}
            {report.missingCount > 0 && (
              <button
                type="button"
                onClick={selectAllMissing}
                className="px-3 py-1.5 text-xs border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors whitespace-nowrap shrink-0"
              >
                Select All Missing ({report.missingCount})
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="inline-flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded self-start">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === f.key
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | GapCategory)}
              aria-label="Filter by category"
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {report.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills or keywords..."
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 w-48 focus:outline-none focus:border-white placeholder-neutral-500"
            />
          </div>
        </div>

        {/* Matrix Table */}
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center border-t border-neutral-800 space-y-1.5">
            <p className="text-sm text-neutral-300">
              {report.totalJdTerms === 0
                ? 'No standard cloud or engineering keywords were detected in the job description text.'
                : 'No keywords match your active filter.'}
            </p>
            <p className="text-xs text-neutral-500">
              {report.totalJdTerms === 0
                ? 'Run the Deep AI Gap Audit above to analyze custom or domain-specific requirements.'
                : 'Reset the status, category, or search filter to view all detected JD terms.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-neutral-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 pr-3 font-medium w-8">Add</th>
                  <th className="py-2.5 px-3 font-medium">Keyword / Critical Skill</th>
                  <th className="py-2.5 px-3 font-medium">JD Priority</th>
                  <th className="py-2.5 px-3 font-medium">Resume Coverage</th>
                  <th className="py-2.5 pl-3 font-medium">Action / Placement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredItems.map((item) => {
                  const selectable = item.status !== 'Covered';
                  const isChecked = selectedTerms.includes(item.term);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-3 pr-3 align-top">
                        {selectable ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTerm(item.term)}
                            aria-label={`Select ${item.term} to add`}
                            className="accent-white cursor-pointer mt-0.5"
                          />
                        ) : (
                          <span className="text-emerald-400 font-mono" aria-label="Covered">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="text-white font-medium">{item.term}</div>
                        <div className="text-neutral-500 mt-0.5">{item.category}</div>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span
                          className={
                            item.priority === 'Critical'
                              ? 'text-white font-medium'
                              : 'text-neutral-400'
                          }
                        >
                          {item.priority}
                        </span>
                        <span className="text-neutral-500 font-mono tabular-nums ml-1.5">
                          · {item.jdMentions}x
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top">
                        {item.status === 'Missing' ? (
                          <span className="text-red-400 font-medium">Missing</span>
                        ) : item.status === 'Under-represented' ? (
                          <span className="text-amber-400 font-medium">
                            Skills Only (add to Experience)
                          </span>
                        ) : (
                          <div>
                            <span className="text-emerald-400 font-medium">Covered</span>
                            <div className="text-neutral-500 mt-0.5">
                              {item.foundIn.join(' · ')}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pl-3 align-top text-neutral-300">
                        {item.status === 'Covered' ? (
                          <span className="text-neutral-500">{item.reason}</span>
                        ) : (
                          <div>
                            <span className="text-white font-medium">
                              Add to {item.suggestedPlacement}
                            </span>
                            <div className="text-neutral-500 mt-0.5">{item.reason}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
