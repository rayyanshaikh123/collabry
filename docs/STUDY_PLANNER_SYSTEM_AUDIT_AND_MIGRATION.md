# Study Planner — Full System Audit & Migration Plan

**Document version:** 1.0  
**Date:** 2025-02-14  
**Role:** Principal Engineer / System Architect  
**Scope:** Full codebase audit, target architecture, safe migration strategy. No code changes in this phase.

---

## STEP 1 — FULL SYSTEM AUDIT

### 1.1 Execution Path (Actual Flow)

```
Frontend (PlannerNew.tsx)
  → useGeneratePlan → studyPlanner.service.generatePlan(data)
  → POST /api/study-planner/generate-v2  [404 — ROUTE NOT MOUNTED]
  → Fallback: POST /api/ai/generate-study-plan (proxy)
Backend (ai.routes.js)
  → Proxy to AI_ENGINE_URL/ai/generate-study-plan with JWT
AI Engine (studyplan.py)
  → generate_study_plan() — LLM prompt → JSON parse (multi-strategy) → cognitive load limits
  → Assigns scheduledDate per task (date + duration, NO time slots)
  → Returns StudyPlanResponse { title, description, tasks: TaskGenerated[], ... }
Frontend
  → createPlan(planMeta) → POST /api/study-planner/plans
  → createBulkTasks(planId, tasks) → POST /api/study-planner/tasks/bulk
Backend
  → studyPlan.service.createPlan() → StudyPlan.create()
  → studyTask.service.createBulkTasks() → StudyTask.insertMany() [base StudyTask, no timeSlotStart/End]
```

**Conclusion:** The only live path is **legacy**: AI returns **date + duration** tasks; backend persists **StudyPlan + StudyTask** (base schema). V2 time-slot path is **unreachable** (generate-v2 never mounted).

---

### 1.2 Planner Architecture (Current)

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Frontend | PlannerNew.tsx, studyPlanner.service.ts | Forms, AI trigger, create plan + bulk tasks, today/upcoming/calendar views |
| API | studyPlanner.routes.js | Plans CRUD, tasks CRUD, strategies, exam mode, auto-schedule; **no** generate-v2 |
| Backend controllers | studyPlan.controller, studyTask.controller | Delegate to services; studyPlan.createPlan does **not** call AI |
| Backend services | studyPlan.service, studyTask.service | DB only; studyTask uses **base** StudyTask |
| AI proxy | ai.routes.js | Forwards /generate-study-plan to AI engine with JWT |
| AI engine | studyplan.py | LLM generates tasks; assigns **scheduledDate** per task; cognitive load applied in Python |
| Scheduler (task-based) | scheduling.service.js | autoSchedulePlan: FFD bin-packing, **writes** timeSlotStart/timeSlotEnd on **base** StudyTask (schema does not define these) |
| Adaptive | adaptiveScheduling.service.js | Redistributes missed tasks; uses **StudyTask.ENHANCED** |
| Strategies | BalancedStrategy, AdaptiveStrategy, EmergencyStrategy | Use **StudyTask.ENHANCED**, planHydrator; execute rescheduling/rebalancing |

**Architectural violations:**

- **Dual task model:** Base `StudyTask` (no time slots) vs `StudyTask.ENHANCED` (timeSlotStart/timeSlotEnd). scheduling.service uses base and writes time-slot fields that are not in schema (Mongoose allows; no validation).
- **Planner controller is dead:** planner.controller.js implements `/scheduler/context`, `/scheduler/slots`, `/scheduler/validate`, `/generate-v2`, `/study-events/*` but is **never mounted**. It also `require()`s non-existent modules: `StudyEvent`, `StudySession`, `plannerContextCollector.service`, `slotEngine.service`, `constraintValidator.service`. Mounting it would crash the server.
- **AI does scheduling:** In studyplan.py the AI is prompted with “daily task count”, “intensity”, and **the code assigns scheduledDate** (day offset) to each task. So date placement is done in AI response handling (Python), not in a single deterministic scheduler.

---

### 1.3 AI Engine (Current)

- **studyplan.py:**  
  - Request: subject, topics, startDate, endDate, dailyStudyHours, preferredTimeSlots, difficulty, planType, examDate, planId, authToken.  
  - Optional: fetches backend strategy context (recommended mode, exam strategy, behavior profile) when planId + authToken provided.  
  - LLM prompt asks for tasks with **duration** (15–480 min), **priority**, **difficulty**; response schema has **no** startTime/endTime.  
  - Code then: parses JSON (direct / markdown / regex / fallback programmatic), applies cognitive load limits, **assigns scheduledDate** by day offset (tasks_per_day, day_offset).  
  - Output: `TaskGenerated`: title, description, topic, **scheduledDate**, duration, priority, difficulty, order, resources.

- **ai_planner_agent.py (AIPlannerAgent):**  
  - Designed for **time-slot** sessions (startTime/endTime).  
  - Flow: context from backend `/api/planner/scheduler/context`, slots from `/api/planner/scheduler/slots`, then `_generate_sessions_with_ai()` which **prompts LLM to assign sessions to slots** (AI outputs startTime/endTime).  
  - **Violation:** AI is still **assigning timestamps** (placing events on calendar). Target architecture requires AI to never assign timestamps.  
  - This agent is only callable if something calls `/ai/v2/generate-smart-schedule`; that route is **not** present in ai-engine server main.py (only studyplan router is included; no v2 route found). So AIPlannerAgent is effectively dead code.

- **tools/generate_study_plan.py:** LangChain tool; returns day/date/title/duration tasks (no time slots). Used in agent flows, not in the main web “Generate plan” path.

**Summary:**  
- Live path: AI returns **task list with date + duration**; Python code **assigns** scheduledDate.  
- No structured output schema (Pydantic) for AI response; parsing is try/except + fallback.  
- No retry-with-correction or deterministic heuristic fallback when parsing fails beyond programmatic distribution.

---

### 1.4 Backend Services

- **studyPlan.service:** createPlan(userId, planData) → StudyPlan.create(). No AI call, no validation beyond schema.
- **studyTask.service:** Uses **base** StudyTask. createBulkTasks maps taskData (scheduledDate, duration, etc.) and insertMany. Does **not** set timeSlotStart/timeSlotEnd (frontend can send them; base schema does not define them).
- **scheduling.service (SchedulingService):**  
  - autoSchedulePlan(planId): load plan + pending tasks, _generateTimeSlots (from plan start/end, dailyStudyHours, preferredTimeSlots), _allocateTasksToSlots (FFD), then **writes** timeSlotStart, timeSlotEnd, scheduledDate on each task. Uses **base** StudyTask — schema does not declare these fields.  
  - Conflict detection, suggestTimeSlot, rescheduleTask, handleMissedTask.
- **adaptiveScheduling.service:** Uses **StudyTask.ENHANCED**. Redistributes missed tasks; _generateFutureSlots, _allocateTasks with cognitive limits (max 4 tasks/day, max 2 hard/day).
- **Strategies (Balanced, Adaptive, Emergency):** All use **StudyTask.ENHANCED** and planHydrator. They reschedule/rebalance; do not generate initial plan.
- **examStrategy.service:** Phase (concept_building, practice_heavy, revision, light_review), intensity, taskDensityPerDay. Used by studyPlan controller and AI (when planId + token provided).
- **Planner controller dependencies (missing):**  
  - plannerContextCollector.service — **does not exist**  
  - slotEngine.service — **does not exist**  
  - constraintValidator.service — **does not exist**  
  - StudyEvent model — **does not exist** (only SharedStudyEvent exists)  
  - StudySession model — **does not exist**

---

### 1.5 Scheduler Logic (Current)

- **Location:** scheduling.service.js (task-based), adaptiveScheduling.service.js (missed-task redistribution).
- **Scattered:**  
  - Slot generation: scheduling.service._generateTimeSlots (30-min slots, preferred windows); adaptiveScheduling._generateFutureSlots (30-min, preferred time names).  
  - Allocation: FFD in scheduling; priority + cognitive limits in adaptive.  
  - No single “scheduler engine” that owns all constraints (timetable, locked blocks, etc.).
- **Constraints:**  
  - dailyStudyHours, preferredTimeSlots only.  
  - **No** academic timetable (different weekdays, lab days, coaching, commute).  
  - **No** locked blocks or “availability grid” from user settings.
- **Output:** Tasks get timeSlotStart/timeSlotEnd (or remain date+duration only if auto-schedule not run). Base StudyTask schema does not define these; ENHANCED does.

---

### 1.6 Database Schemas

- **StudyPlan:** userId, title, description, subject, topics, startDate, endDate, dailyStudyHours, preferredTimeSlots, difficulty, planType, status, examDate, examMode, currentExamPhase, examPhaseConfig, adaptiveMetadata, etc. No timetable or locked-slots structure.
- **StudyTask (base):** planId, userId, title, description, topic, **scheduledDate**, scheduledTime, duration, priority, difficulty, status, order, reschedule fields. **No** timeSlotStart/timeSlotEnd (but scheduling.service writes them).
- **StudyTask.ENHANCED:** Extends base with timeSlotStart, timeSlotEnd, schedulingMetadata, behaviorMetadata, examProximityScore, etc. Used by strategies and adaptiveScheduling; **not** used by studyTask.service or scheduling.service for create/autoSchedule.
- **StudyEvent / StudySession:** Referenced by planner.controller.js but **models do not exist** in repo (only SharedStudyEvent exists).

---

### 1.7 API Contracts

- **Frontend → Backend:**  
  - Plans: POST/GET/PUT/DELETE /api/study-planner/plans, GET analytics, exam-mode, recommended-mode, execute-strategy, auto-schedule.  
  - Tasks: CRUD, bulk create, complete, reschedule, today/upcoming/overdue.  
  - **POST /api/study-planner/generate-v2** — **not implemented** (404); frontend falls back to /api/ai/generate-study-plan.
- **Backend → AI engine:**  
  - Proxy POST /ai/generate-study-plan with body (subject, topics, startDate, endDate, dailyStudyHours, etc.) and Authorization.  
  - Response: StudyPlanResponse (title, description, tasks[], estimatedCompletionDays, totalTasks, recommendations, warnings).
- **AI engine → Backend (optional):**  
  - get_recommended_mode, get_exam_strategy, get_behavior_profile (when planId + authToken in request). Backend URL built from CONFIG (BACKEND_URL, BACKEND_API_PREFIX).

**Silent contract risk:**  
- Frontend generatePlan() can return tasks with **timeSlotStart/timeSlotEnd** when V2 is used; V2 is never reached. After fallback, tasks have scheduledDate + duration. createBulkTasks sends whatever the frontend builds (scheduledDate, duration, and if present timeSlotStart/timeSlotEnd). Backend studyTask.service passes through; base schema ignores time-slot fields for validation.

---

### 1.8 Frontend Planner UI

- **PlannerNew.tsx:** Tabs (today, upcoming, calendar, plans, strategy). Create plan (AI vs manual). AI flow: form → generatePlan (V2 then legacy) → show generated plan → user saves → createPlan + createBulkTasks. Today/upcoming lists by task. Calendar component exists.
- **Emphasis:** Task lists and “create plan” flow. **No** “Today’s Execution Plan” as primary time-slot view; no drag-reschedule, resize, or conflict warnings in the main flow. Calendar may not show locked blocks or flexible vs fixed sessions.
- **Types (studyPlanner.service):** StudyTask has optional timeSlotStart/timeSlotEnd; AIGeneratedPlan tasks include scheduledDate and duration; after V2 fallback, frontend maps sessions to tasks with timeSlotStart/timeSlotEnd but backend path is legacy (date+duration).

---

### 1.9 Async Flows

- **Auth:** Frontend apiClient injects Bearer token; on 401, refresh then retry. Backend protect middleware verifies JWT, loads user, attaches req.user (req.user.id used in controllers). AI proxy forwards Authorization to AI engine; AI engine get_current_user from JWT.
- **Double calls:** Possible if user double-clicks “Generate”; no visible debounce or disable-on-submit in the described flow.
- **Race:** createPlan then createBulkTasks; if createBulkTasks fails, plan is already created (orphan plan). No transactional “plan + tasks” creation.
- **AI timeout:** Backend proxy to AI has default axios timeout; planner.controller (unmounted) used 60000 ms for V2. Legacy proxy may use shorter timeout; long LLM runs can fail with no retry.

---

### 1.10 Error Handling

- **Backend:** asyncHandler passes errors to next(); errorHandler middleware. studyPlan controller returns 400/404 for hydration and “plan not found”. Auth: 401 when no/invalid token or user not found.
- **Frontend:** generatePlan catch shows alert; createPlan/createBulkTasks throw on invalid response; getPlans/getTodayTasks return [] on error (swallow).
- **AI engine:** studyplan.py HTTPException 400/500; JSON parse failure → fallback programmatic plan; no retry with correction, no Pydantic validation of full response.
- **Risks:** 401 on refresh failure can leave user on planner with no clear “session expired” handling. Undefined plan.id vs plan._id handled in frontend with fallback. Malformed AI response can still produce tasks (fallback); no guarantee all required fields present on every task.

---

### 1.11 Detected Issues Summary

| Category | Issue |
|----------|--------|
| **Architecture** | V2 path (generate-v2, scheduler/context, slots, validate) not mounted; planner.controller depends on missing services (StudyEvent, slotEngine, plannerContextCollector, constraintValidator). |
| **AI role** | AI (studyplan.py) effectively assigns scheduledDate (day placement). AIPlannerAgent (if ever used) would assign startTime/endTime — AI must not assign timestamps per target. |
| **Dual model** | Base StudyTask vs StudyTask.ENHANCED; scheduling.service writes time-slot fields on base model (not in schema). |
| **Duplication** | Slot generation in scheduling.service and adaptiveScheduling.service; allocation logic in both. |
| **Validation** | No strong schema validation (Zod/Pydantic/JSON Schema) for AI study-plan response; parse + fallback only. |
| **Timetable** | No academic timetable or locked blocks; scheduler does not respect institution constraints. |
| **Event model** | No StudyEvent/StudySession; calendar-native event model missing. |
| **Auth** | 401 handling present; possible edge cases on token refresh during long AI request. |
| **Orphan plans** | Plan created before bulk tasks; partial failure leaves plan with no tasks. |
| **Planner UI** | Task-list centric; “Today’s Execution Plan” and calendar-native interactions (drag, resize, conflicts) not primary. |

---

## STEP 2 — TARGET ARCHITECTURE

**Upgrade from:** “AI-generated task lists”  
**To:** “Constraint-aware adaptive scheduling system”

**Non-negotiable:**

- **AI = strategy brain only**  
  - Decompose syllabus; estimate effort; difficulty; priorities; revision strategy; emergency compression.  
  - **Must NOT:** assign timestamps, place events on calendar, or override constraints.

- **Scheduler = deterministic math engine**  
  - Load constraints (timetable, availability, locked blocks).  
  - Build availability grid, score slots, allocate sessions, inject revision, rebalance, reschedule missed.  
  - All placement and time decisions in the scheduler.

**Target flow:**

1. **Frontend:** User defines plan (subject, topics, dates, preferences, optional timetable).
2. **Backend:** Persist plan; optionally call **AI Planning Strategy Service** (no timestamps).
3. **AI returns structured strategy only**, e.g.:
   - subjects, topics[] (name, difficultyScore, estimatedHours, priorityWeight, dependencies, revisionStrategy),
   - totalEstimatedHours, recommendedDailyLoadRange, emergencyPlan.
4. **Scheduler engine (backend):**  
   - Load academic timetable, build availability grid, filter locked slots.  
   - Map strategy topics to sessions; assign **startTime/endTime** (and flexWindowStart/flexWindowEnd if needed).  
   - Persist as **events** (event model: startTime, endTime, flexWindowStart, flexWindowEnd, priorityScore, energyTag, rescheduleCount).
5. **Frontend:** “Today’s Execution Plan” and calendar with drag/resize, conflict warnings, locked blocks.

---

## STEP 3 — SAFE MIGRATION PLAN

1. **Do not remove or change existing APIs** until replacements are live and verified (backward compatibility).
2. **Introduce adapters:**  
   - New “strategy” endpoint that returns only strategy payload (no dates/times).  
   - New scheduler endpoint that accepts strategy + constraints and returns events.  
   - Keep legacy generate-study-plan and create plan + bulk tasks working during transition.
3. **Database:** Add new event collection/model (e.g. StudyEvent) without removing StudyTask; dual-write or migration script later; no destructive schema change on existing collections.
4. **Feature flags / routing:** Prefer routing new UI to new flow (strategy → scheduler → events) while keeping old flow for existing plans and fallback.
5. **Rollback:** New scheduler and event model must be switchable off without breaking existing plan/task CRUD.

---

## STEP 4 — REFACTOR AI INTO PLANNING STRATEGY SERVICE (Design)

- **Structured output schema (example):**
  - subjects: string[]
  - topics: [{ name, difficultyScore, estimatedHours, priorityWeight, dependencies[], revisionStrategy }]
  - totalEstimatedHours, recommendedDailyLoadRange: { minHours, maxHours }, emergencyPlan: object
- **Absolute rule:** No timestamps, no scheduling, no date/day assignment in AI output.
- **Implementation:** New endpoint (e.g. `/ai/planning-strategy` or `/ai/v2/planning-strategy`) with Pydantic response model; prompt instructs LLM to return only this structure.

---

## STEP 5 — SCHEMA VALIDATION (Design)

- **Backend or AI engine:** Validate AI response with Zod / JSON Schema / Pydantic.
- **On invalid:** Retry once with auto-correction prompt; if still invalid, fallback to deterministic heuristic (e.g. equal hours per topic, default priorities).
- **Guarantee:** System must not crash on malformed LLM output; always return a valid strategy or safe fallback.

---

## STEP 6 — TRUE SCHEDULER ENGINE (Design)

- **Centralize** all scheduling in one engine (e.g. schedulerEngine.service.js or equivalent).
- **Responsibilities:** Load constraints → build availability grid → filter locked slots → score slots (weighted) → allocate sessions → spaced revision → rebalance → reschedule missed.
- **Deterministic and explainable:** Same inputs → same outputs; no LLM in the loop for placement.

---

## STEP 7 — ACADEMIC TIMETABLE ENGINE (Design)

- **Support:** Different schedules per weekday, recurring college blocks, semester changes, lab days, coaching, optional commute block.
- **Storage:** Plan or user settings: e.g. weekly template (dayOfWeek → blocks with start/end or “locked”).
- **Scheduler:** Treat these as hard constraints; no session placed in locked time.

---

## STEP 8 — TASK MODEL → EVENT MODEL (Design)

- **Event document fields (example):** startTime, endTime, flexWindowStart, flexWindowEnd, priorityScore, energyTag, rescheduleCount, topic, planId, userId, status, etc.
- **Migration:** New plans can create events only; existing plans can keep tasks and/or map to events via adapter.

---

## STEP 9 — AUTO-RECOVERY (Design)

- When sessions are missed: scheduler recomputes using remaining capacity and strategy; persist updated events; UI shows supportive messaging (no “failure-heavy” UX).

---

## STEP 10 — RUNTIME ERROR HARDENING (Design)

- **Fix:** 401 handling (already partially there), undefined writes, null refs, malformed AI responses, async races, double calls.
- **Add:** Defensive guards, typed responses, global error handler, retry for transient failures, circuit breaker for AI if needed. Fail gracefully, never catastrophically.

---

## STEP 11 — FRONTEND ALIGNMENT (Design)

- Planner home: “Today’s Execution Plan” (time slots) as primary; task lists secondary.
- Calendar: drag reschedule, resize, conflict warnings, locked academic blocks, flexible vs fixed sessions; clarity over feature bloat.

---

## STEP 12–15 — PERFORMANCE, EDGE CASES, VALIDATION, SELF-REVIEW (Design)

- Heavy scheduling in async/background where appropriate; do not block UI.
- Edge cases: timetable changes, deadline shifts, overload, cancelled classes, sudden free slots, burnout patterns — scheduler recomputes safely.
- Final validation: simulate onboarding, timetable setup, AI strategy generation, scheduling, missed sessions, exam proximity; verify adaptive execution behavior.
- Self-review before release: no duplicated logic, no hidden runtime risks, no contract breaks, no AI scheduling leakage, no unnecessary complexity.

---

## Summary

- **Current system:** Single live path — legacy AI (date+duration) → create plan + bulk tasks (base StudyTask). V2 and planner controller are unmounted and depend on missing services. AI assigns dates; two task models; no timetable; no event model.
- **Target:** AI = strategy only (no timestamps); scheduler = single deterministic engine; event model; timetable support; validation and safe fallbacks; frontend focused on “Today’s Execution Plan” and calendar-native interactions.
- **Migration:** Adapters, backward compatibility, new endpoints and models without breaking existing behavior, then incremental cutover and optional deprecation of legacy path.

No code has been modified in this phase; the next phase is to implement the migration steps in order, with tests and rollout controls.
