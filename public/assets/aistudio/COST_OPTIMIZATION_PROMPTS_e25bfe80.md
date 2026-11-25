# Role Architect Cost Optimization — Execution Prompt Playbook

Use these prompts to replicate the exact cost optimization architecture, Free-Tier hybrid routing (`gemini-3.1-flash-lite` + `gemini-4-hydrogen`), single-role prompt trimming, and in-app **Cost & Models** dashboard across any other **Role Architect** application or variant.

---

## How to Use This Playbook

- **Fastest Option (One-Shot):** Paste **Prompt 1 (Master Execution Prompt)** into your Role Architect project.
- **Step-by-Step Option:** Run **Prompt 2 → Prompt 3 → Prompt 4 → Prompt 6** sequentially for granular review at each layer.
- **Read-Only Audit Option:** Run **Prompt 5** first if you want a cost baseline report before modifying code.

---

## Prompt 1: Master End-to-End Execution Prompt (One-Shot)

```text
Perform a full AI cost optimization refactor across this Role Architect application and add an interactive Cost & Models dashboard. Follow these exact architectural rules:

1. MODELS & FREE-TIER ROUTING STRATEGY (Lowest Cost + Free Tier Only)
   - Upgrade `@google/genai` to the latest version (`>= 3.4.0`).
   - Standardize Role Architect on TWO core Free-Tier-eligible text models, plus one Free-Tier fallback:
     a) `gemini-3.1-flash-lite` ($0.25/1M input, $1.50/1M output, $0.025/1M cached):
        Primary workhorse for `parse-resume`, `application-answer`, `optimize-resume`, and `eco` mode tailoring/cover letters. Set `thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }`.
     b) `gemini-4-hydrogen` ($1.50/1M input, $7.50/1M output, $0.075/1M cached):
        Primary synthesis engine in `hybrid` mode for `tailor-resume` and `cover-letter`, and last-resort fallback in `eco` mode. Set `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }` and DO NOT pass `temperature`, `topP`, `topK`, or `candidateCount` to `gemini-4-*` models.
     c) `gemini-2.5-flash` ($0.30/1M input, $2.50/1M output, $0.030/1M cached):
        Secondary Free-Tier fallback only (do NOT pass `thinkingConfig.thinkingLevel` to `gemini-2.5-*` models).
   - Explicitly exclude paid-only models (`gemini-4-argon`, `gemini-4-carbon`) from active execution.
   - Retire `gemini-3.8-flash` from default cascades.

2. REMOVE UNUSED LIVE VOICE & STREAMING ENDPOINTS
   - Remove any unused WebSocket Live Voice API (`gemini-3.8-live`), `ws` upgrade handlers, `/api/gemini/live`, `/api/gemini/stream`, and unused client streaming/WebSocket helpers so the app runs strictly on streamlined text/JSON endpoints.

3. SINGLE-ROLE PROMPT LOOKUP (Eliminate ~70-75% Input Token Bloat)
   - Refactor the Role Intelligence Layer prompts inside `tailor-resume`, `application-answer`, and `cover-letter` from a monolithic multi-role block into keyed lookup maps (`Record<string, string>`) indexed by `targetRole`.
   - Inject ONLY the selected `targetRole`'s intelligence block into each request while preserving 100% of every role's definitions, formulas, boundaries, and ATS keywords.

4. COST PROFILES, SHARED CATALOG & TELEMETRY
   - Create a shared `costCatalog.ts` module (using pure TypeScript types/constants with NO runtime `enum` declarations so Node 22 strip-only TypeScript works cleanly in production).
   - Include `MODEL_CATALOG`, `TASK_ROUTING_POLICIES` for `'eco'` (Flash-Lite first across all 5 endpoints) and `'hybrid'` (Flash-Lite for parse/Q&A/optimize + Gemini 4 Hydrogen for tailor/cover-letter), `estimateTokenCostUsd()`, and `calculateMonthlyProjection()` modeling 100–500 monthly workflow runs.
   - Extract `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`, `totalTokenCount`) on every server Gemini call, billing thinking tokens at the output rate, and return `_usage` on the JSON response.
   - Update `services/geminiService.ts` to send the active `costProfile` (persisted in `localStorage`, defaulting to `'eco'`), log `_usage` into a local session ledger (`localStorage`), strip `_usage` from returned payloads, and emit a window custom event so the UI stays synced.

5. IN-APP COST & MODELS DASHBOARD + ROUTING MODE SELECTOR
   - Add a `Cost & Models` tab to the main navigation bar and a `Model Routing Mode` toggle (`Eco · Flash-Lite` vs. `Hybrid · Lite + Hydrogen`) on the New Application view.
   - Build `CostOptimizationDashboard.tsx` using a clean dark monochrome SaaS layout with `font-mono tabular-nums`, single-elevation 1px borders (`border-neutral-800`), unboxed metadata (no pill badges or pulsing dots), and full interactive controls:
     - 4-column KPI strip (Models Required, Monthly Spend, Input Token Reduction, Tracked Session Spend).
     - Interactive 100–500 runs/month slider with `100` / `250` / `500` presets and a `Free Tier` vs. `Pay-As-You-Go` billing toggle.
     - Models Needed & Cost Per Model comparison table (`gemini-3.1-flash-lite`, `gemini-4-hydrogen`, `gemini-2.5-flash`, `gemini-3.8-flash`, `gemini-3.8-live`, `gemini-4-argon`).
     - Endpoint-by-endpoint routing & prompt trim audit table.
     - Live Session Token Telemetry table filterable by task type, with empty state and `Clear Ledger` action.

6. VERIFICATION
   - Ensure all relative server imports from TypeScript files use `import type` for types/interfaces and `.ts` extensions where runtime values are imported so `NODE_ENV=production node server.ts` starts cleanly alongside Express 5 path-less SPA fallback (`app.use(...)`).
   - Run production build and verify `/api/health`.
```

---

## Prompt 2: Modular Prompt A — Backend Routing, Prompt Trimming & Live API Removal

```text
Optimize the server-side Gemini architecture (`server.ts`) in this Role Architect app for minimum token cost and Free-Tier compatibility:

1. Upgrade `@google/genai` to latest (`>= 3.4.0`).
2. Remove the unused Live Voice WebSocket server (`ws`, `WebSocketServer`, `/api/gemini/live`, `gemini-3.8-live`) and unused `/api/gemini/stream` SSE endpoint so only the 5 active text/JSON endpoints remain:
   - `/api/gemini/tailor-resume`
   - `/api/gemini/optimize-resume`
   - `/api/gemini/application-answer`
   - `/api/gemini/cover-letter`
   - `/api/gemini/parse-resume`
3. Refactor all Role Intelligence blocks into keyed maps (`ROLE_TAILORING_PROMPTS`, `ROLE_QA_HINTS`, `ROLE_COVER_LETTER_HINTS`) keyed by `targetRole` so each request injects ONLY the active role's instructions instead of all roles combined. Preserve every existing role definition, boundary rule, formula, and ATS keyword verbatim.
4. Implement task-based hybrid routing via `costProfile` (`'eco' | 'hybrid'`, default `'eco'`):
   - `'eco'`: Route all 5 endpoints to `gemini-3.1-flash-lite` first -> `gemini-2.5-flash` -> `gemini-4-hydrogen`.
   - `'hybrid'`: Route `parse-resume`, `application-answer`, and `optimize-resume` to `gemini-3.1-flash-lite` -> fallback; route `tailor-resume` and `cover-letter` to `gemini-4-hydrogen` -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash`.
5. Enforce per-model config rules:
   - For `gemini-3.1-flash-lite`: set `thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }`.
   - For `gemini-4-hydrogen`: set `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }` and delete `temperature`, `topP`, `topK`, and `candidateCount` from config.
   - For `gemini-2.5-flash`: do NOT attach `thinkingConfig.thinkingLevel`.
6. Extract `response.usageMetadata` on every call, compute `estimatedCostUsd` (billing `candidatesTokenCount + thoughtsTokenCount` at the model's output rate), and return `_usage` alongside the JSON payload.
```

---

## Prompt 3: Modular Prompt B — Shared Cost Catalog & Client Telemetry Service

```text
Create a shared cost & model catalog (`costCatalog.ts`) and wire client telemetry in `types.ts` and `services/geminiService.ts`:

1. In `costCatalog.ts` (use pure TypeScript types and const objects only—no `enum` syntax so Node 22 strip-only TS can import it directly):
   - Define `MODEL_CATALOG` with exact per-1M-token rates:
     * `gemini-3.1-flash-lite`: $0.25 input / $1.50 output / $0.025 cached (Active Core, Free Tier)
     * `gemini-4-hydrogen`: $1.50 input / $7.50 output / $0.075 cached (Active Core, Free Tier)
     * `gemini-2.5-flash`: $0.30 input / $2.50 output / $0.030 cached (Fallback, Free Tier)
     * `gemini-3.8-flash`: $0.75 input / $3.75 output / $0.075 cached (Retired; doubles Jan 1, 2027)
     * `gemini-3.8-live`: $3.00 audio input / $4.50-$12.00 output (Removed)
     * `gemini-4-argon`: $2.00 input / $10.00 output / $0.100 cached (Excluded Paid Benchmark; increases Dec 1, 2026)
   - Define `TASK_ROUTING_POLICIES` for `'eco'` and `'hybrid'` profiles with baseline vs. optimized token estimates and workflow weights (1.0 Tailor + 0.5 Optimize + 2.0 Q&A + 0.5 Cover Letter + 0.2 Parse).
   - Export `estimateTokenCostUsd()` and `calculateMonthlyProjection(runsPerMonth, profile)`.
2. In `types.ts`, add `UsageMetadata`, `UsageRecord`, and optional `_usage?: UsageMetadata`.
3. In `services/geminiService.ts`:
   - Remove any unused `streamGeminiContent` or `createLiveWebSocket` exports.
   - Persist `costProfile` (`'eco' | 'hybrid'`) and `usageHistory` (`UsageRecord[]`, max 100) in `localStorage`.
   - Automatically pass `costProfile` in every POST request body, intercept `_usage` from every response, record it to the session ledger, emit a custom window event (`role-architect-usage-updated`), and strip `_usage` before returning data to UI components.
```

---

## Prompt 4: Modular Prompt C — In-App Cost & Models Dashboard UI

```text
Build an in-app `CostOptimizationDashboard` component and integrate it into `App.tsx`:

1. Add a `Cost & Models` navigation tab in `App.tsx` (alongside `New Application` and `History & Logs`) that expands the main container to `max-w-6xl` when active, plus a quick `Model Routing Mode` toggle (`Eco · Flash-Lite` vs. `Hybrid · Lite + Hydrogen`) on the `New Application` view.
2. Design `components/CostOptimizationDashboard.tsx` to match Role Architect's dark monochrome aesthetic (`#0a0a0a` / `#171717` / `border-neutral-800`):
   - Enforce `font-mono tabular-nums` on all numbers, token counts, percentages, and dollar figures.
   - Keep single-elevation flat containers with 1px hairline borders (no nested card-inside-card boxes, no thick left accent borders, no pill badge clusters, no decorative pulsing dots).
3. Include these sections:
   - Header controls: Routing profile toggle (`Flash-Lite Eco` vs. `Hybrid Lite + Hydrogen`) and Billing mode toggle (`Free Tier` vs. `Pay-As-You-Go`).
   - 4-column KPI strip: `Models Required`, `Monthly Spend`, `Input Token Reduction`, and `Tracked Session Spend`.
   - Monthly Volume & Cost Simulator (`100` to `500` runs/month slider with `100`, `250`, `500` preset buttons), baseline vs. optimized vs. Argon comparison bars, and per-model token/cost allocation table.
   - Models Needed & Cost Per Model table showing Input/1M, Output/1M, Cached/1M, Thinking mode, and Status.
   - Endpoint Routing & Prompt Optimization Audit table showing primary -> fallback chains, `-X%` prompt trim savings, and single-run cost.
   - Live Session Token Telemetry table filterable by task type (`All`, `Tailor`, `Optimize`, `Q&A`, `Cover Letter`, `Parse`) with empty state + `Clear Ledger` button.
```

---

## Prompt 5: Read-Only Cost Audit Prompt (Run Before Editing New Apps)

```text
Perform a read-only cost optimization audit of this Role Architect repository without modifying files yet:

1. Inspect all client and server files for Gemini SDK usage, model names, system prompt sizes, `thinkingConfig`, and any unused streaming/WebSocket/Live API routes.
2. Measure or estimate current input and output tokens per workflow endpoint (`tailor-resume`, `optimize-resume`, `application-answer`, `cover-letter`, `parse-resume`).
3. Highlight the exact minimum Gemini models required for this app to work on the Free Tier (`gemini-3.1-flash-lite` and `gemini-4-hydrogen`, plus `gemini-2.5-flash` fallback), and list the per-1M-token input, output, and cached input cost for every model currently referenced vs. recommended.
4. Model monthly costs for 100, 250, and 500 workflow runs/month before and after single-role prompt trimming and task-based routing, and present a prioritized optimization plan.
```

---

## Prompt 6: Production & Railway Deployment Hardening Prompt

```text
Verify and harden this Role Architect full-stack TypeScript app for Railway and Node 22+ production deployment (`npm run build` followed by `NODE_ENV=production node server.ts`):

1. Ensure Express 5 compatibility in `server.ts`: replace any bare `app.get('*', ...)` SPA catch-all with a path-less `app.use((_req, res) => res.sendFile(...))` handler, and expose `/health` and `/api/health` returning HTTP 200.
2. Ensure Node 22 strip-only TypeScript compatibility when executing `node server.ts` directly:
   - Use `import type` for all type/interface imports (`Request`, `Response`, `Schema`, `TargetRole`, `ResumeData`, `TailoredResume`, `CostProfile`, etc.).
   - Include `.ts` extensions on relative value imports in `server.ts` (e.g. `./costCatalog.ts`) and ensure no shared server-imported modules use runtime `enum` syntax.
3. Run `npm run build` and test `NODE_ENV=production PORT=3006 node server.ts` with `curl http://localhost:3006/api/health` to confirm clean startup.
```
