# Error-Prone Patterns - Study Notebook Architecture

## Overview
This document catalogs common error patterns identified during the study notebook audit and provides future reference for maintaining code quality.

---

## ❌ Pattern 1: Generic Error Messages

### Problem
Catch blocks that ignore the actual error and show generic messages to users.

### Bad Example
```typescript
try {
  await removeSource.mutateAsync(sourceId);
} catch (e) {
  showError('Failed to remove source'); // ❌ Generic - user doesn't know why
}
```

### Good Example
```typescript
try {
  await removeSource.mutateAsync(sourceId);
} catch (e: any) {
  showError(e.message || 'Failed to remove source'); // ✅ Shows actual API error
}
```

### Why This Matters
- **User Frustration:** "Failed to X" doesn't explain WHY it failed
- **Permission Issues Hidden:** Users don't know if it's a permission error, network error, or validation error
- **Support Burden:** Users can't self-diagnose issues

### Where Found
- ✅ **Fixed in:** `page.tsx` (handleRemoveSource, handleDeleteNotebook)
- ✅ **Fixed in:** `NotebookInviteModal.tsx` (loadCollaborators)

### API Client Already Handles This
The `api.ts` client properly formats errors:
```typescript
private formatError(error: any): Error {
  if (axios.isAxiosError(error)) {
    let message = error.response?.data?.message || error.response?.data?.error;
    // ... extracts and returns actual message
  }
}
```

**Action:** Always access `error.message` in catch blocks.

---

## ❌ Pattern 2: Silent Failures

### Problem
Errors logged to console without user feedback.

### Bad Example
```typescript
try {
  const res = await notebookService.getCollaborators(notebookId);
  setCollaborators(res.data);
} catch (err) {
  console.error('Failed to load collaborators:', err); // ❌ Silent to user
}
```

### Good Example
```typescript
try {
  const res = await notebookService.getCollaborators(notebookId);
  setCollaborators(res.data);
} catch (err: any) {
  console.error('Failed to load collaborators:', err);
  showError(err.message || 'Failed to load collaborators'); // ✅ User sees it
}
```

### Why This Matters
- **Invisible Bugs:** Users think feature is working but see no data
- **No Feedback Loop:** User doesn't know to retry or check permissions
- **Debug Difficulty:** Users report "it doesn't work" without context

### Where Found
- ✅ **Fixed in:** `NotebookInviteModal.tsx` (loadCollaborators was completely silent)

### Detection Rule
Search for: `console.error` without corresponding `showError`/`showWarning`

---

## ❌ Pattern 3: Missing `await` on Async Operations

### Problem
Setting loading state to false before async operation completes.

### Bad Example
```typescript
if (type === 'course-finder') {
  handleSendMessage(message); // ❌ No await - runs async
  setIsGenerating(false); // ❌ Runs immediately!
  setGeneratingType(null);
  return;
}
```

### Good Example
```typescript
if (type === 'course-finder') {
  await handleSendMessage(message); // ✅ Waits for completion
  setIsGenerating(false); // ✅ Only runs after message sent
  setGeneratingType(null);
  return;
}
```

### Why This Matters
- **UX Degradation:** Loader disappears before action completes
- **Race Conditions:** State updates can conflict with async results
- **Confusing Feedback:** User sees "done" spinner but nothing happened yet

### Where Found
- ✅ **Fixed in:** `useArtifactGenerator.ts` (course-finder, infographic)

### Detection Rule
Search for: Function calls without `await` followed by state updates

### Visual Symptom
Bouncing dots loader that disappears instantly (< 1 second).

---

## ❌ Pattern 4: Missing Artifact Persistence

### Problem
Artifacts generated and displayed in chat but never saved to notebook.

### Bad Example
```typescript
if (type === 'course-finder') {
  // ... build message
  handleSendMessage(message); // ❌ Just sends chat message
  return; // ❌ No artifact linking
}
```

### Good Example
```typescript
if (type === 'course-finder') {
  // Option A: Use structured artifact request (preferred)
  await handleArtifactRequest({
    artifact: 'course-finder',
    topic: topics,
    params: {}
  });

  // Option B: Add save handler in ChatPanel
  // Provide onSaveCourseFinderToStudio button
  // Call linkArtifact with inline data storage
}
```

### Why This Matters
- **Data Loss:** Users can't reopen generated artifacts
- **Studio Panel Empty:** Artifact doesn't appear in saved items
- **Inconsistent UX:** Other artifacts save but this one doesn't

### Where Found
- ✅ **Fixed:** Course-finder now has complete save flow
- ✅ **Already Working:** Quiz, flashcards, mindmap, infographic

### Architecture Pattern

**Two storage strategies:**

1. **Backend Collections** (Quiz, MindMap):
   ```typescript
   // Save to dedicated collection first
   const quiz = await createQuiz.mutateAsync(data);
   // Then link to notebook
   await linkArtifact.mutateAsync({
     type: 'quiz',
     referenceId: quiz._id, // ObjectId reference
     title: 'Quiz title',
     data: quiz // Optional inline copy
   });
   ```

2. **Inline Storage** (Flashcards, Infographic, Course-Finder):
   ```typescript
   // Save directly to notebook artifacts array
   await linkArtifact.mutateAsync({
     type: 'course-finder',
     referenceId: `courses-${Date.now()}`, // Timestamp-based ID
     title: 'Course Recommendations',
     data: { courses } // Full data stored inline
   });
   ```

### Checklist for New Artifacts
- [ ] handleArtifactRequest support OR custom prompt
- [ ] AI engine prompt in `artifact_prompts.py`
- [ ] Parser in ChatPanel (extract from AI response)
- [ ] Save handler in `useStudioSave.ts`
- [ ] Display logic in `ArtifactViewer.tsx`
- [ ] Type added to backend enum
- [ ] Type added to frontend interfaces

---

## ❌ Pattern 5: Inconsistent Error Access

### Problem
Different parts of codebase access error properties differently.

### Bad Examples
```typescript
// Inconsistent patterns:
error.response?.data?.message  // ❌ Bypasses api.ts formatting
error?.message                 // ⚠️ Works but missing fallback
(error as any).toString()      // ❌ Loses structure
```

### Good Example
```typescript
// API client formats to standardized Error with .message
catch (error: any) {
  showError(error.message || 'Fallback text'); // ✅ Consistent
}
```

### Why This Matters
- **Maintenance Burden:** Different error patterns everywhere
- **Missed Errors:** Some paths don't extract message correctly
- **Type Safety:** Bypassing api.ts loses TypeScript benefits

### Solution
The `api.ts` client already normalizes all errors to have `.message` property:

```typescript
// api.ts does this for you:
private formatError(error: any): Error {
  // Handles axios errors, network errors, timeout errors, etc.
  // Always returns Error with .message property
  return formattedError;
}
```

**Standard Pattern:**
```typescript
try {
  await api.method();
} catch (error: any) {
  showError(error.message || 'Default message');
}
```

---

## 🔍 Detection Checklist

Run these searches to find potential issues:

### Generic Errors
```bash
# Find hardcoded error messages in catch blocks
grep -r "showError('Failed" frontend/
```

### Silent Failures
```bash
# Find console.error without showError nearby
grep -B2 -A2 "console.error" frontend/ | grep -v "showError"
```

### Missing Await
```bash
# Find async handlers without await (manual review needed)
grep -r "handleSendMessage\|handleArtifactRequest" frontend/hooks/
# Check if followed by immediate state updates
```

### Inconsistent Types
```bash
# Find artifact type unions
grep -r "quiz.*mindmap.*flashcards" frontend/
# Verify 'course-finder' is included
```

---

## ✅ Best Practices Summary

### 1. Error Handling
```typescript
try {
  await asyncOperation();
} catch (error: any) {
  console.error('Context:', error);
  showError(error.message || 'User-friendly message');
}
```

### 2. Async Operations
```typescript
// Always await before updating state
await handleSendMessage(message);
setIsGenerating(false);
```

### 3. Artifact Persistence
```typescript
// Generation → Parsing → Save Handler → Link to Notebook
// Provide "Save to Studio" button in ChatPanel
// Call linkArtifact with appropriate storage strategy
```

### 4. Type Safety
```typescript
// Keep types synchronized:
// - backend/src/models/Notebook.js (enum)
// - frontend/lib/services/notebook.service.ts (interface)
// - frontend/hooks/*.ts (function signatures)
```

### 5. User Feedback
```typescript
// Always provide feedback for user actions
showSuccess('Operation completed');
showError(error.message || 'Failed to complete');
showWarning('Are you sure?');
showInfo('Feature coming soon');
```

---

## 📋 Code Review Checklist

When reviewing new features:

- [ ] All async operations have `await`
- [ ] Loading states set **after** operations complete
- [ ] Error messages show `error.message` not generic text
- [ ] No silent failures (all errors show user feedback)
- [ ] Artifact types added to all enum/union definitions
- [ ] New artifact types have complete save flow
- [ ] TypeScript errors resolved (run `get_errors`)
- [ ] No race conditions in state updates
- [ ] Consistent error handling pattern used

---

## 🎯 Impact of Fixes

| Pattern | Issues Found | Fixed | Risk Level |
|---------|--------------|-------|------------|
| Generic Errors | 3 | ✅ 3 | Medium |
| Silent Failures | 1 | ✅ 1 | High |
| Missing Await | 2 | ✅ 2 | High |
| Missing Persistence | 2 | ✅ 2 | Medium |
| Inconsistent Types | Multiple | ✅ All | Low |

**Total:** 8+ issues fixed with systematic patterns

---

## 📚 Related Documentation

- **API Error Handling:** `frontend/lib/api.ts` (formatError method)
- **Artifact System:** Research findings in conversation summary
- **Type Definitions:** `frontend/lib/services/notebook.service.ts`
- **Save Handlers:** `frontend/hooks/useStudioSave.ts`

---

**Keep this document updated as new patterns emerge!**
