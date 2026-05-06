# AeroLicense Landing Hero Banner — Design Spec

**Goal:** Add a compact hero banner at the top of the Dashboard page that communicates product identity and tech stack to both academic evaluators and professional audiences, without pushing KPI data below the fold.

**Architecture:** A single inline `HeroBanner` component added to `Dashboard.jsx`. No new files, no new dependencies. Uses existing design tokens from `theme.js`.

**Tech Stack:** React 18, inline styles, existing `theme.js` tokens.

---

## Layout

The banner is a full-width horizontal strip (~72px tall) rendered as the first element inside `Dashboard.jsx`, directly above the KPI cards row, with `marginBottom: 24`.

### Visual structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [⬡] AeroLicense · Verificação Blockchain de Licenças de Aviação        │
│      Projeto académico ISEC Lisboa · 2025          [Ethereum] [SHA-256] │
│                                                    [FastAPI] [ANAC] [Web3.py] │
└─────────────────────────────────────────────────────────────────────────┘
```

Two-column layout (`justifyContent: 'space-between'`, `alignItems: 'center'`):

**Left column:**
- Row 1: gradient icon (16×16, `gradientPrimary`, chain-link SVG) + `AeroLicense` (16px, bold, `c.text`) + `·` + tagline `"Verificação Blockchain de Licenças de Aviação"` (13px, `c.textMuted`)
- Row 2: `"Projeto académico ISEC Lisboa · 2025"` (10px, `c.textDim`)

**Right column:**
- 5 tech pills in a flex row with `flexWrap: 'wrap'`, `gap: 6`
- Each pill: small colored dot (6×6px circle) + label text (11px, bold)
- Pill container: `background: ${color}18`, `border: 1px solid ${color}44`, `borderRadius: 20`, `padding: '3px 10px'`

### Tech pills

| Label     | Color        |
|-----------|--------------|
| Ethereum  | `c.purple`   |
| SHA-256   | `c.primaryLt`|
| FastAPI   | `c.green`    |
| ANAC      | `c.amber`    |
| Web3.py   | `c.primaryLt`|

---

## Styling

| Property        | Value                                    |
|-----------------|------------------------------------------|
| background      | `c.bgSurface`                            |
| border          | `1px solid ${c.border}`                  |
| borderLeft      | `3px solid ${c.primary}` (gradient accent) |
| borderRadius    | `12`                                     |
| padding         | `'16px 20px'`                            |
| marginBottom    | `24`                                     |

---

## Implementation

- **File modified:** `frontend/src/pages/Dashboard.jsx`
- **Approach:** Inline `HeroBanner` component function defined at the top of the file, rendered as the first JSX element in the Dashboard's return block.
- **Icon:** Reuse the chain-link SVG inline (same as `BlockchainIcon` in `Sidebar.jsx`).
- **Tech pills data:** Defined as a `TECH_PILLS` constant array at the top of the component.

```js
const TECH_PILLS = [
  { label: 'Ethereum',  color: c.purple    },
  { label: 'SHA-256',   color: c.primaryLt },
  { label: 'FastAPI',   color: c.green     },
  { label: 'ANAC',      color: c.amber     },
  { label: 'Web3.py',   color: c.primaryLt },
];
```

No changes to routing, `App.jsx`, `theme.js`, or any other file.

---

## Out of scope

- A separate landing page route
- Animations or transitions
- Responsive breakpoints (pills wrap naturally)
- CTA buttons
