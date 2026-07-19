# Plan: Command input polish — fix prompt path + fix cursor

## Context

Two small fixes to the command input row:

1. **Double `/` in prompt** — `currentPath` is built as `~/${section}`, so on home it's `~/` and the prompt renders `visitor@portfolio:~/$ `. When the user then types `/about`, it reads `~/$ /about` — slash appears twice. Fix: strip the trailing slash so home shows `~` → prompt renders `visitor@portfolio:~$ `, and typing `/about` reads cleanly `~$ /about`.

2. **Static cursor on far right** — `<Cursor />` is rendered after `<input>`, sitting at the far right of the row. Remove it. The `<input>` already has `caret-color: #00ff41` so the browser's native green caret follows typing naturally.

---

## Changes — `src/app/App.tsx` only

### 1. Fix `currentPath` — strip trailing slash

```ts
// Before
const currentPath = `~/${section === "home" ? "" : section}`;

// After
const currentPath = section === "home" ? "~" : `~/section`;
// i.e.: section === "home" ? "~" : `~/${section}`
```

### 2. Remove `<Cursor />` from input row

```tsx
// Before
<Prompt path={currentPath} />
<input … />
<Cursor />

// After
<Prompt path={currentPath} />
<input … />
```

---

## Critical file

- `src/app/App.tsx` — 2 targeted edits

## Verification

1. On home: prompt reads `visitor@portfolio:~$ ` (no trailing slash)
2. Typing `/about` reads `visitor@portfolio:~$ /about` — clean, no double slash
3. On other sections: `visitor@portfolio:~/about$ ` etc. unchanged
4. No green block cursor stuck on the right; browser caret moves with text
