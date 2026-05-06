# Demo Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen demo login gate with two role cards (Operador / Inspector ANAC) before the dashboard; the selected role appears as a badge in the header.

**Architecture:** App-level state gate in `App.jsx` — when `isLoggedIn` is false, render `<LoginPage />` instead of the full `Header + Sidebar + Routes` shell. On login, persist role to `sessionStorage` so a refresh does not reset the session.

**Tech Stack:** React 18, inline styles, existing `theme.js` tokens (`c`, `gradientPrimary`, `shadow`)

---

## Roles

| Role card | Display label | Sub-label | Badge text |
|---|---|---|---|
| `operador` | Operador de Companhia | TAP Air Portugal | Operador |
| `inspector` | Inspector ANAC | Autoridade Nacional de Aviação Civil | Inspector ANAC |

---

## Files

| Action | Path | Purpose |
|---|---|---|
| Create | `frontend/src/pages/LoginPage.jsx` | Full-screen login with two role cards |
| Modify | `frontend/src/App.jsx` | Add `isLoggedIn` + `activeRole` state; conditionally render login or shell |
| Modify | `frontend/src/components/Header.jsx` | Accept `activeRole` prop; render role badge on right side |

---

## Visual Design

### LoginPage

- Full viewport, `bgDeep` (#020B16) background
- Centered card (`bgCard`, `border`, `borderRadius: 16`, `shadow.card`), max-width 480px
- Top of card: gradient plane icon (36×36, same as `Header`) + "AeroLicense" wordmark + tagline "Gestão de Licenças de Aviação"
- Below wordmark: subtitle text "Selecione o perfil para aceder à demonstração"
- Two role cards side-by-side:
  - Default: `bgElevated` background, `border` outline
  - Hover: `shadow.hover`, `borderHover` outline
  - Selected: `primary` border (2px), `primaryGlow` background tint, no hover override
- Each role card contains: icon (briefcase SVG for Operador, shield SVG for Inspector) + role label (bold) + sub-label (muted)
- "Entrar" button: `gradientPrimary`, `borderRadius: 10`, disabled + 50% opacity until a role is selected
- Footer line below card: "Demo académico · ISEC Lisboa · Dados simulados" in `textDim`

### Role badge in Header

- Rendered in the `right` section, before the divider + bell
- Layout: small icon (briefcase or shield, 12×12) + role label text
- Style: `bgElevated` background, `primaryLt` text, `border` outline, `borderRadius: 20`, `padding: '4px 10px'`, `fontSize: 11`
- Only rendered when `activeRole` prop is truthy

---

## State & Persistence

- `App.jsx` reads `sessionStorage.getItem('aero_role')` on mount to rehydrate
- On login: `sessionStorage.setItem('aero_role', role)`, then set `isLoggedIn = true` and `activeRole = role`
- No logout — session persists until the browser tab is closed

---

## Behaviour Details

- Clicking a role card selects it (visual change: primary border + tint); clicking again deselects (toggles)
- "Entrar" button is `type="button"`, not a form submission
- No animation required — state changes are instant
- The login page has no `Header` or `Sidebar` — it is a standalone full-screen view

---

## Non-Goals

- No real authentication
- No routing change (`/login` route not added)
- No logout button
- No role-based content differences in the dashboard
