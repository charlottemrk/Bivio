# Bivio — Implementation Specs
> Precise, file-by-file instructions to fix every UX/UI issue.
> Read DESIGN_GUIDELINES.md first for the "why". This file is the "how".
> Every section has: what to change, exact before/after, and the reason.

---

## HOW TO READ THIS DOCUMENT

- **🔴 CRITICAL** — Breaks UX. Fix before any other work.
- **🟠 HIGH** — Visible inconsistency. Fix in the next batch.
- **🟡 MEDIUM** — Polish. Fix when touching the related file.
- `→` means "replace with"
- Code blocks show the exact change to make.

---

## STEP 1 — FOUNDATION: Design tokens & CSS (index.css)
*Do this first. Everything else builds on it.*

### 1.1 — Add spacing tokens 🟠
**File:** `src/index.css`
**After** the `@theme` block, add spacing variables so they can be referenced consistently.

```css
/* ADD inside @theme block, after --color-border-2 */

/* ── Spacing scale (8px grid) ── */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
```

### 1.2 — Fix SectionLabel font size 🟠
**File:** `src/components/Card.tsx` line 33
The `SectionLabel` uses `fontSize: 11` — below the 12px minimum.

```tsx
// BEFORE
<div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>

// AFTER
<div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
```
*Why: 11px fails readability. marginBottom 10 → 8 to stay on-grid.*

### 1.3 — Fix Badge font size 🟠
**File:** `src/components/Badge.tsx` line 28
Badge uses `fontSize: 11` — below minimum.

```tsx
// BEFORE
fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',

// AFTER
fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
```

### 1.4 — Add hover states to Button component 🟠
**File:** `src/components/Button.tsx`
The Button has no hover or focus states.

```tsx
// BEFORE (line 37)
export function Button({ children, onClick, disabled, type = 'button', variant = 'primary', size = 'md', fullWidth, style }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// AFTER — add onMouseEnter/Leave for hover feedback
export function Button({ children, onClick, disabled, type = 'button', variant = 'primary', size = 'md', fullWidth, style }: Props) {
  const [hovered, setHovered] = React.useState(false)

  const hoverStyle: React.CSSProperties = !disabled && hovered ? {
    opacity: variant === 'primary' ? 0.88 : 1,
    filter: variant === 'secondary' || variant === 'ghost' ? 'brightness(0.96)' : 'none',
  } : {}

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...hoverStyle,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
```
*Also add `import React from 'react'` at the top if not already imported.*

---

## STEP 2 — NEW COMPONENT: RoleChip
*Create once. Use everywhere in carpooling flow.*

### 2.1 — Create RoleChip component 🔴
**Create file:** `src/components/RoleChip.tsx`

```tsx
type Props = {
  role: 'driver' | 'passenger'
  style?: React.CSSProperties
}

const ROLE_CONFIG = {
  driver: {
    emoji: '🚗',
    label: 'Conducteur',
    background: 'var(--color-violet-light)',
    color: 'var(--color-violet-dark)',
    border: '1px solid var(--color-violet)',
  },
  passenger: {
    emoji: '🙋',
    label: 'Passager',
    background: 'var(--color-peach-light)',
    color: '#b05a1a',
    border: '1px solid var(--color-peach)',
  },
}

export function RoleChip({ role, style }: Props) {
  const config = ROLE_CONFIG[role]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 700,
      background: config.background,
      color: config.color,
      border: config.border,
      ...style,
    }}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
```

---

## STEP 3 — App.tsx (AppShell header)

### 3.1 — Fix header padding to use 8px grid 🟡
**File:** `src/App.tsx` line 73
`gap: 16` is fine. No changes needed to structure. But the main content padding needs review.

**Line 160:**
```tsx
// BEFORE
<main style={{ ...col, padding: '0 24px 80px' }}>

// AFTER — add top padding so first page has breathing room
<main style={{ ...col, padding: '16px 24px 80px' }}>
```
*Why: Without top padding, page content starts immediately below the sticky header border. 16px gives visual separation.*

---

## STEP 4 — EventJoin.tsx
*This page has the most issues: double back button, font mixing, inconsistent spacing, SectionLabel vs inline labels.*

### 4.1 — Remove duplicate back button 🔴
**File:** `src/pages/EventJoin.tsx` lines 170–175
Delete these lines entirely. The header already handles back navigation.

```tsx
// DELETE THIS ENTIRE BLOCK (lines 170–175):
<button
  onClick={() => navigate(`/event/${shortId}`)}
  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 0 12px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
>
  ← L'événement
</button>
```

### 4.2 — Fix page top padding to be on-grid 🟠
**File:** `src/pages/EventJoin.tsx` line 168

```tsx
// BEFORE
<div className="animate-fade-up" style={{ paddingTop: 8 }}>

// AFTER
<div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
```

### 4.3 — Fix event name: stop mixing serif inline 🔴
**File:** `src/pages/EventJoin.tsx` lines 177–184
The event name is currently inline inside a `<p>` sentence using Instrument Serif. This creates a font collision.

```tsx
// BEFORE (lines 177–184)
<div style={{ paddingBottom: 20 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.5px' }}>
    Ton trajet
  </h1>
  <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
    Pour <strong style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 400, color: 'var(--color-text)' }}>{eventName}</strong>
  </p>
</div>

// AFTER — event name on its own line, serif respected
<div style={{ paddingBottom: 24 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
    Ton trajet
  </h1>
  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2, marginTop: 8 }}>
    Pour
  </p>
  <p style={{
    fontFamily: "'Instrument Serif', serif",
    fontStyle: 'italic',
    fontSize: 20,
    fontWeight: 400,
    color: 'var(--color-text)',
    margin: 0,
    lineHeight: 1.2,
  }}>
    {eventName}
  </p>
</div>
```

### 4.4 — Add RoleChip after role selection 🔴
**File:** `src/pages/EventJoin.tsx`
Add import at top:
```tsx
import { RoleChip } from '../components/RoleChip'
```

After the role selection grid (after line 211), add:
```tsx
{/* Role confirmation chip — visible after selection */}
{role && (
  <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 4 }}>
    <RoleChip role={role === 'driver' ? 'driver' : 'passenger'} />
  </div>
)}
```

### 4.5 — Replace inline `<p>` labels with SectionLabel 🟠
**File:** `src/pages/EventJoin.tsx`

The passenger form uses raw `<p>` for section sub-labels. Replace all of these:

```tsx
// BEFORE (line 279)
<p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 600 }}>
  Gratuit si trajet inférieur à :
</p>

// AFTER — use a lighter weight inline label (not SectionLabel which is uppercase)
<p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8, fontWeight: 600 }}>
  Gratuit si trajet inférieur à :
</p>
```

```tsx
// BEFORE (line 349)
<p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 6, fontWeight: 600 }}>
  Disponible à partir de
</p>

// AFTER
<p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8, fontWeight: 600 }}>
  Disponible à partir de
</p>
```

```tsx
// BEFORE (line 364)
<p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 600 }}>
  Heure d'arrivée souhaitée
</p>

// AFTER
<p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8, fontWeight: 600 }}>
  Heure d'arrivée souhaitée
</p>
```

*Why: Color was `--color-text-2` (dark gray) for sub-labels but `--color-text-3` (light gray) for metadata. Sub-labels inside a card should be `--color-text-3` since SectionLabel already uses that. Unify.*

### 4.6 — Fix gap between cards to 12px 🟠
**File:** `src/pages/EventJoin.tsx` line 186

```tsx
// BEFORE
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

// AFTER — already 12, but verify the `gap: 14` inside the horaires card
```

**Line 346 inside passenger Card (horaires):**
```tsx
// BEFORE
<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

// AFTER — 14 → 16 (next grid step)
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
```

### 4.7 — Remove redundant bottom back button 🟠
**File:** `src/pages/EventJoin.tsx` lines 419–429
The bottom "← Retour à l'événement" button is a second duplicate.

```tsx
// DELETE this entire button (lines 419–429):
<button
  onClick={() => navigate(`/event/${shortId}`)}
  style={{
    width: '100%', padding: '12px', background: 'none',
    border: '1.5px solid var(--color-border)', borderRadius: 12,
    fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
    cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
  }}
>
  ← Retour à l'événement
</button>
```

*If you want to keep navigation visible, use the `<Button>` component with `variant="secondary"` — but only if there's a genuine reason beyond what the header provides.*

---

## STEP 5 — EventMatches.tsx
*Most complex page. Two completely different views (driver/passenger) that share problems.*

### 5.1 — Remove duplicate back buttons 🔴
**File:** `src/pages/EventMatches.tsx`

**Driver view:** lines 392–409 — Remove the two raw `<button>` elements at the bottom:
```tsx
// DELETE (lines 392–409):
<div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
  <button onClick={() => navigate(`/event/${shortId}/join`)} style={{...}}>
    ✏️ Modifier mon trajet
  </button>
  <button onClick={() => navigate(`/event/${shortId}`)} style={{...}}>
    ← Retour à l'événement
  </button>
</div>
```

**Replace with:**
```tsx
<div style={{ marginTop: 24 }}>
  <Button
    variant="secondary"
    size="md"
    fullWidth
    onClick={() => navigate(`/event/${shortId}/join`)}
  >
    ✏️ Modifier mon trajet
  </Button>
</div>
```
*Keep "Modifier mon trajet" since it's a specific action (not just "go back"). Remove the redundant "Retour" — header handles it.*

**Passenger view:** lines 581–598 — Same fix:
```tsx
// DELETE (lines 581–598):
<div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
  <button onClick={() => navigate(`/event/${shortId}/join`)} style={{...}}>
    ✏️ Modifier mon trajet
  </button>
  <button onClick={() => navigate(`/event/${shortId}`)} style={{...}}>
    ← Retour à l'événement
  </button>
</div>
```

**Replace with:**
```tsx
<div style={{ marginTop: 24 }}>
  <Button
    variant="secondary"
    size="md"
    fullWidth
    onClick={() => navigate(`/event/${shortId}/join`)}
  >
    ✏️ Modifier mon trajet
  </Button>
</div>
```

Also delete the inline back button at line 422–427 (passenger view):
```tsx
// DELETE (lines 422–427):
<button
  onClick={() => navigate(`/event/${shortId}`)}
  style={{ background: 'none', border: 'none', cursor: 'pointer', ... }}
>
  ← L'événement
</button>
```

### 5.2 — Fix page top padding 🟠
**File:** `src/pages/EventMatches.tsx`

**Driver view** line 234:
```tsx
// BEFORE
<div className="animate-fade-up" style={{ paddingTop: 8 }}>

// AFTER
<div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
```

**Passenger view** line 418:
```tsx
// BEFORE
<div className="animate-fade-up" style={{ paddingTop: 8 }}>

// AFTER
<div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
```

### 5.3 — Add RoleChip to both views 🔴
**File:** `src/pages/EventMatches.tsx`
Add import at top:
```tsx
import { RoleChip } from '../components/RoleChip'
```

**Driver view** — add after `{toast && ...}`, before the title div (line 236):
```tsx
{toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

{/* ADD: role identity — always visible */}
<div style={{ marginBottom: 16 }}>
  <RoleChip role="driver" />
</div>

<div style={{ paddingBottom: 20 }}>
  <h1 ...>
```

**Passenger view** — add after `{toast && ...}`, before the back button placeholder (line 419):
```tsx
{toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

{/* ADD: role identity — always visible */}
<div style={{ marginBottom: 16 }}>
  <RoleChip role="passenger" />
</div>

<div style={{ paddingBottom: 20 }}>
```

### 5.4 — Fix dead space in driver trip summary card 🔴
**File:** `src/pages/EventMatches.tsx` lines 265–272
All three rows are conditional. When null, the card body is empty.

```tsx
// BEFORE (lines 265–272)
<div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
  {myReg.departure_address && <div>📍 <strong>{myReg.departure_address}</strong></div>}
  {myReg.preferred_arrival && myReg.preferred_arrival !== 'flexible' && (
    <div style={{ color: 'var(--color-text-2)' }}>🕐 Départ : <strong style={{ color: 'var(--color-text)' }}>{myReg.preferred_arrival}</strong></div>
  )}
  {trunkTag && <div style={{ color: 'var(--color-text-2)' }}>🧳 Coffre : <strong style={{ color: 'var(--color-text)' }}>{trunkTag}</strong></div>}
</div>

// AFTER — fallbacks for every nullable field, gap on grid
<div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
  <div>
    📍 <strong>
      {myReg.departure_address
        ? myReg.departure_address
        : <em style={{ color: 'var(--color-text-3)', fontStyle: 'normal' }}>Adresse non renseignée</em>
      }
    </strong>
  </div>
  <div style={{ color: 'var(--color-text-2)' }}>
    🕐 Départ :{' '}
    <strong style={{ color: 'var(--color-text)' }}>
      {myReg.preferred_arrival && myReg.preferred_arrival !== 'flexible'
        ? myReg.preferred_arrival
        : 'Horaire flexible'
      }
    </strong>
  </div>
  {trunkTag && (
    <div style={{ color: 'var(--color-text-2)' }}>
      🧳 Coffre : <strong style={{ color: 'var(--color-text)' }}>{trunkTag}</strong>
    </div>
  )}
</div>
```

### 5.5 — Fix Tags minimum font size 🟠
**File:** `src/pages/EventMatches.tsx` line 39

```tsx
// BEFORE
fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',

// AFTER
fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
```

### 5.6 — Standardize distance badges 🟡
**File:** `src/pages/EventMatches.tsx`
Distance badges currently use `color` (a per-driver rotating color) as the badge tint. This means each driver card has a differently colored distance badge, which is inconsistent and arbitrary.

**Passenger view** lines 524–528:
```tsx
// BEFORE
<div style={{
  background: color + '22', borderRadius: 8, padding: '2px 8px',
  fontSize: 11, fontWeight: 700, color, marginTop: 2,
}}>
  {driver._dist} km
</div>

// AFTER — neutral consistent badge
<div style={{
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8, padding: '3px 8px',
  fontSize: 12, fontWeight: 700,
  color: 'var(--color-text-2)', marginTop: 2,
}}>
  {driver._dist} km
</div>
```

**Driver view** (pending requests section) lines 345–351:
```tsx
// BEFORE
<div style={{
  background: dist < 10 ? 'var(--color-green-light)' : 'var(--color-surface-2)',
  border: `1px solid ${dist < 10 ? 'var(--color-green)' : 'var(--color-border)'}`,
  borderRadius: 10, padding: '4px 10px',
  fontSize: 12, fontWeight: 700,
  color: dist < 10 ? 'var(--color-green)' : 'var(--color-text-2)',
}}>{dist} km</div>

// AFTER — consistent neutral, no semantic color on distance
<div style={{
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8, padding: '3px 8px',
  fontSize: 12, fontWeight: 700,
  color: 'var(--color-text-2)',
}}>{dist} km</div>
```
*Why: Distance is a neutral data point — not a success metric. Coloring close distances green implies "good" in a way that isn't meaningful here.*

### 5.7 — Fix spacing in pending requests (driver) 🟠
**File:** `src/pages/EventMatches.tsx` line 301

```tsx
// BEFORE
<div style={{ marginBottom: 8 }}>

// AFTER — 8 → 0, let the section flow with the card gap
<div>
```

The section label margin:
```tsx
// BEFORE (line 302)
<div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>

// AFTER — 10 → 8, on-grid; also match the accepted section label style
<div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
```

### 5.8 — Improve pending passenger state 🔴
**File:** `src/pages/EventMatches.tsx`
When a passenger has a pending request, other drivers should be visually unavailable.

In the passenger driver list map (line 501), update the driver card style:
```tsx
// BEFORE (line 501–506)
<div key={driver.id} style={{
  background: 'var(--color-surface)',
  border: `2px solid ${isRequested ? color : 'var(--color-border)'}`,
  borderRadius: 20, padding: 18,
  boxShadow: isRequested ? `0 0 0 3px ${color}22` : 'none',
  transition: 'all 0.15s',
}}>

// AFTER — dim non-requested cards when pending
<div key={driver.id} style={{
  background: 'var(--color-surface)',
  border: `2px solid ${isRequested ? 'var(--color-violet)' : 'var(--color-border)'}`,
  borderRadius: 20, padding: 18,
  boxShadow: isRequested ? '0 0 0 3px var(--color-violet-light)' : 'none',
  opacity: myMatchStatus === 'pending' && !isRequested ? 0.35 : 1,
  pointerEvents: myMatchStatus === 'pending' && !isRequested ? 'none' : 'auto',
  transition: 'all 0.2s',
}}>
```
*Why: When waiting for confirmation, the user should not be able to fire off a second request. Dimming communicates "not available right now" without removing the cards.*

### 5.9 — Fix "Accepter/Refuser" buttons to use Button component 🟠
**File:** `src/pages/EventMatches.tsx` lines 361–384
These two inline `<button>` elements should use the `<Button>` component.

```tsx
// BEFORE (lines 360–384)
<div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
  <button
    onClick={() => handleDecline(p)}
    style={{
      flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'inherit',
      background: 'none', border: '1.5px solid var(--color-border)',
      fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', cursor: 'pointer',
    }}
  >
    Refuser
  </button>
  <button
    onClick={() => handleAccept(p)}
    disabled={seatsLeft <= 0}
    style={{
      flex: 2, padding: '10px', borderRadius: 10, fontFamily: 'inherit',
      background: seatsLeft > 0 ? 'var(--color-violet)' : 'var(--color-border)',
      border: 'none', fontSize: 14, fontWeight: 800,
      color: seatsLeft > 0 ? '#fff' : 'var(--color-text-3)',
      cursor: seatsLeft > 0 ? 'pointer' : 'not-allowed',
    }}
  >
    ✓ Accepter
  </button>
</div>

// AFTER
<div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
  <div style={{ flex: 1 }}>
    <Button
      variant="secondary"
      size="sm"
      fullWidth
      onClick={() => handleDecline(p)}
    >
      Refuser
    </Button>
  </div>
  <div style={{ flex: 2 }}>
    <Button
      variant="primary"
      size="sm"
      fullWidth
      disabled={seatsLeft <= 0}
      onClick={() => handleAccept(p)}
    >
      ✓ Accepter
    </Button>
  </div>
</div>
```

### 5.10 — Fix Toast dismiss touch target 🔴
**File:** `src/pages/EventMatches.tsx` lines 24–29

```tsx
// BEFORE
<button onClick={onDismiss} style={{
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
  color: '#fff', cursor: 'pointer', padding: '2px 8px',
  fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
}}>×</button>

// AFTER — minimum 44px touch target
<button onClick={onDismiss} style={{
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
  color: '#fff', cursor: 'pointer',
  minWidth: 44, minHeight: 44,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
  flexShrink: 0,
}}>×</button>
```

### 5.11 — Fix passenger view h1 title 🟠
**File:** `src/pages/EventMatches.tsx` lines 430–437
The page title "Conducteurs disponibles" changes to "Demande envoyée" based on status — this is good. But the sub-line is too small and color is off.

```tsx
// BEFORE (lines 430–437)
<div style={{ paddingBottom: 20 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
    {myMatchStatus === 'pending' ? 'Demande envoyée' : 'Conducteurs disponibles'}
  </h1>
  <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
    {matches.length > 0
      ? `${matches.length} conducteur${matches.length > 1 ? 's' : ''} sur ta route`
      : 'Pas de conducteur dans ta zone pour l\'instant'}
  </p>
</div>

// AFTER — add event context + tighten spacing
<div style={{ paddingBottom: 24 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
    {myMatchStatus === 'pending' ? 'Demande envoyée' : 'Conducteurs disponibles'}
  </h1>
  <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginTop: 4 }}>
    {matches.length > 0
      ? `${matches.length} conducteur${matches.length > 1 ? 's' : ''} sur ta route`
      : 'Aucun conducteur dans ta zone pour l\'instant'
    }
  </p>
</div>
```

### 5.12 — Fix driver view h1 title block 🟠
**File:** `src/pages/EventMatches.tsx` lines 237–244
Add event context to driver view:

```tsx
// BEFORE
<div style={{ paddingBottom: 20 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
    Ton trajet conducteur
  </h1>
  <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
    Pour <strong style={{ color: 'var(--color-text)' }}>{eventData?.name}</strong>
  </p>
</div>

// AFTER — event name on its own line
<div style={{ paddingBottom: 24 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
    Ton trajet
  </h1>
  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2, marginTop: 8 }}>
    Pour
  </p>
  <p style={{
    fontFamily: "'Instrument Serif', serif",
    fontStyle: 'italic',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--color-text)',
    margin: 0,
    lineHeight: 1.2,
  }}>
    {eventData?.name}
  </p>
</div>
```

### 5.13 — Fix seat badge red background 🟡
**File:** `src/pages/EventMatches.tsx` lines 255–261
Red background for 0 seats is too alarming.

```tsx
// BEFORE
<div style={{
  background: seatsLeft > 0 ? 'var(--color-green-light)' : '#fee2e2',
  border: `1px solid ${seatsLeft > 0 ? 'var(--color-green)' : '#ef4444'}`,
  borderRadius: 10, padding: '4px 10px',
  fontSize: 12, fontWeight: 700,
  color: seatsLeft > 0 ? 'var(--color-green)' : '#ef4444',
}}>
  {seatsLeft} place{seatsLeft !== 1 ? 's' : ''} restante{seatsLeft !== 1 ? 's' : ''}
</div>

// AFTER — use semantic colors from theme
<div style={{
  background: seatsLeft > 0 ? 'var(--color-green-light)' : 'var(--color-red-light)',
  border: `1px solid ${seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-red)'}`,
  borderRadius: 10, padding: '4px 10px',
  fontSize: 12, fontWeight: 700,
  color: seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-red)',
}}>
  {seatsLeft > 0
    ? `${seatsLeft} place${seatsLeft !== 1 ? 's' : ''} disponible${seatsLeft !== 1 ? 's' : ''}`
    : 'Complet'
  }
</div>
```
*Why: The content also changes — "0 places restantes" is confusing, "Complet" is clear.*

### 5.14 — Fix accepted passenger section spacing 🟡
**File:** `src/pages/EventMatches.tsx` line 277

```tsx
// BEFORE
<div style={{ marginBottom: 20 }}>

// AFTER — 20 → 24 (on-grid)
<div style={{ marginBottom: 24 }}>
```

```tsx
// Line 279 — section label
// BEFORE
<div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
  ✓ Passagers confirmés · {accepted.length}

// AFTER — use text-3 for labels, 8px margin
<div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
  Passagers confirmés · {accepted.length}
```
*Checkmark on a section label is visual noise. The green card border already communicates "confirmed".*

---

## STEP 6 — EventConfirmed.tsx

### 6.1 — Fix top padding 🟠
**File:** `src/pages/EventConfirmed.tsx` line 69

```tsx
// BEFORE
<div className="animate-fade-up" style={{ paddingTop: 8 }}>

// AFTER
<div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
```

### 6.2 — Remove duplicate back button 🔴
**File:** `src/pages/EventConfirmed.tsx` lines 72–77

```tsx
// DELETE (lines 72–77):
<button
  onClick={() => navigate(`/event/${shortId}`)}
  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 0 8px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
>
  ← L'événement
</button>
```

### 6.3 — Fix event name in success block 🟠
**File:** `src/pages/EventConfirmed.tsx` line 92–94
Event name is inline inside a `<p>` with serif italic — same font mixing issue.

```tsx
// BEFORE
<p style={{ fontSize: 14, color: 'var(--color-text-2)', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
  {event?.name}
</p>

// AFTER — on its own line, proper size
<p style={{
  fontFamily: "'Instrument Serif', serif",
  fontStyle: 'italic',
  fontSize: 20,
  fontWeight: 400,
  color: 'var(--color-text)',
  marginTop: 4,
}}>
  {event?.name}
</p>
```

### 6.4 — Fix detail row font size 🟡
**File:** `src/pages/EventConfirmed.tsx`
Inside the driver info card and event recap card, detail labels use `fontSize: 11`. Minimum is 12.

Line 104: `fontSize: 11` → `fontSize: 12`
Line 131: `fontSize: 11` → `fontSize: 12`
Line 140: `fontSize: 11` → `fontSize: 12`
Line 151: `fontSize: 11` → `fontSize: 12`
Line 162: `fontSize: 11` → `fontSize: 12`

### 6.5 — Fix spacing in action buttons 🟡
**File:** `src/pages/EventConfirmed.tsx` line 170

```tsx
// BEFORE
<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>

// AFTER — 10 → 12 (on-grid), 16 → 16 (already on-grid)
<div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
```

---

## STEP 7 — MyEvents.tsx

### 7.1 — Fix header spacing 🟡
**File:** `src/pages/MyEvents.tsx` line 74–76

```tsx
// BEFORE
<div style={{
  paddingTop: 32, paddingBottom: 24,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
}}>

// AFTER — paddingBottom 24 → 16 (h1 already has marginBottom: 14, together they make 30 which is close to 32)
<div style={{
  paddingTop: 32, paddingBottom: 16,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
}}>
```

### 7.2 — Replace CTA button with Button component 🟠
**File:** `src/pages/MyEvents.tsx` lines 85–94
The "Créer un event" button uses an inline `<button>`, not the `<Button>` component.

```tsx
// BEFORE
<button
  onClick={() => navigate('/events/new')}
  style={{
    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    background: 'var(--color-violet)', color: 'white',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  }}
>
  + Créer un event
</button>

// AFTER
<Button onClick={() => navigate('/events/new')} size="sm">
  + Créer un event
</Button>
```
*Add `import { Button } from '../components/Button'` at top of file.*

### 7.3 — Fix event card bottom margin 🟡
**File:** `src/pages/MyEvents.tsx` line 163

```tsx
// BEFORE
<div key={event.id} style={{ display: 'flex', gap: 0, marginBottom: 12 }}>

// AFTER — 12 is fine, but gap: 0 is misleading. The card has marginLeft: 10. Clarify:
<div key={event.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
```

### 7.4 — Fix empty state for tab with no items 🟡
**File:** `src/pages/MyEvents.tsx` lines 142–146
Currently just text. Add more breathing room.

```tsx
// BEFORE
{all.length > 0 && list.length === 0 && (
  <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--color-text-3)', fontSize: 14 }}>
    {tab === 'upcoming' ? 'Aucun event à venir' : 'Aucun event passé'}
  </div>
)}

// AFTER
{all.length > 0 && list.length === 0 && (
  <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 32 }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>
      {tab === 'upcoming' ? '🗓️' : '📦'}
    </div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
      {tab === 'upcoming' ? 'Aucun event à venir' : 'Aucun event passé'}
    </div>
    {tab === 'upcoming' && (
      <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
        Crée un event ou attends d'être invité·e
      </div>
    )}
    {tab === 'upcoming' && (
      <Button onClick={() => navigate('/events/new')} size="sm">
        + Créer un event
      </Button>
    )}
  </div>
)}
```

---

## STEP 8 — Loading states (all pages)

### 8.1 — Replace text-only loading with spinner 🟠
**Files:** `EventMatches.tsx` line 217, `EventConfirmed.tsx` line 55, `EventJoin.tsx` line 165

The `AppShell` already has a `Spinner` component. Extract it to a shared component.

**Create:** `src/components/Spinner.tsx`
```tsx
export function Spinner({ message = 'Chargement…' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 16,
      color: 'var(--color-text-3)',
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-violet)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  )
}
```

**Replace in each page:**
```tsx
// BEFORE (EventMatches, EventConfirmed, EventJoin)
if (loading) return (
  <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
    Chargement...
  </div>
)

// AFTER
import { Spinner } from '../components/Spinner'
// ...
if (loading) return <Spinner />
```

---

## STEP 9 — Cross-cutting: inline button cleanup

### 9.1 — Passenger pending cancel button 🟠
**File:** `src/pages/EventMatches.tsx` lines 456–464

```tsx
// BEFORE
<button
  onClick={handleCancelRequest}
  style={{
    background: 'none', border: '1px solid #F5A623', borderRadius: 8,
    fontSize: 12, fontWeight: 600, color: '#F5A623',
    cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit',
  }}
>
  Annuler
</button>

// AFTER — meet touch target + use consistent amber color token
<button
  onClick={handleCancelRequest}
  style={{
    background: 'none', border: '1px solid var(--color-amber)', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: 'var(--color-amber)',
    cursor: 'pointer', padding: '10px 16px', fontFamily: 'inherit',
    minHeight: 44,
  }}
>
  Annuler la demande
</button>
```
*Hardcoded `#F5A623` → `var(--color-amber)`. Label clarified.*

### 9.2 — Empty state action buttons in EventMatches 🟠
**File:** `src/pages/EventMatches.tsx` lines 481–487 (no-matches state)

```tsx
// BEFORE
<button onClick={() => navigate(`/event/${shortId}/join`)} style={{
  background: 'none', border: '1.5px solid var(--color-border)', borderRadius: 12,
  padding: '10px 20px', fontSize: 13, fontWeight: 700,
  color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit',
}}>
  ✏️ Modifier mon point de départ
</button>

// AFTER
<Button variant="secondary" size="sm" onClick={() => navigate(`/event/${shortId}/join`)}>
  ✏️ Modifier mon point de départ
</Button>
```

---

## SUMMARY TABLE — All changes by file

| File | Changes | Priority |
|------|---------|----------|
| `src/index.css` | Add spacing tokens | 🟠 |
| `src/components/Card.tsx` | SectionLabel: font 11→12, margin 10→8 | 🟠 |
| `src/components/Badge.tsx` | Font 11→12 | 🟠 |
| `src/components/Button.tsx` | Add hover states | 🟠 |
| `src/components/RoleChip.tsx` | **CREATE** new component | 🔴 |
| `src/components/Spinner.tsx` | **CREATE** new component | 🟠 |
| `src/App.tsx` | main top padding 0→16px | 🟡 |
| `src/pages/EventJoin.tsx` | Remove 2 back buttons, fix padding, fix event name, add RoleChip, fix sub-label colors, fix inner gap | 🔴🟠 |
| `src/pages/EventMatches.tsx` | Remove 3 back buttons, fix padding, add RoleChip (both views), fix dead space, fix Tags font, fix distance badges, fix spacing, dim pending cards, fix accept/decline buttons, fix Toast dismiss, fix titles | 🔴🟠🟡 |
| `src/pages/EventConfirmed.tsx` | Remove back button, fix padding, fix event name, fix fontSize 11→12 ×5, fix gap 10→12 | 🔴🟠🟡 |
| `src/pages/MyEvents.tsx` | Fix header spacing, replace CTA button, fix empty state | 🟠🟡 |

---

## IMPLEMENTATION ORDER

**Do in this sequence to avoid breaking changes:**

1. `index.css` → spacing tokens (no visual change, just sets tokens)
2. `RoleChip.tsx` → create (nothing uses it yet)
3. `Spinner.tsx` → create (nothing uses it yet)
4. `Card.tsx` → SectionLabel font/margin fix (visual, affects EventJoin)
5. `Badge.tsx` → font fix (subtle)
6. `Button.tsx` → add hover states (additive, no breaking)
7. `EventJoin.tsx` → all fixes (uses RoleChip and Spinner)
8. `EventMatches.tsx` → all fixes (uses RoleChip, Spinner, Button)
9. `EventConfirmed.tsx` → all fixes (uses Spinner)
10. `MyEvents.tsx` → all fixes (uses Button)
11. `App.tsx` → main padding tweak

---

*Specs written: 2026-04-02*
*Based on: DESIGN_GUIDELINES.md audit of all pages*
