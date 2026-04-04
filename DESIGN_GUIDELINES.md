# Bivio — Design Guidelines & UX Audit
> Precise, actionable rules derived from the actual codebase + UX/UI best practices.
> Read this before touching any UI. Run the audit checklists before shipping any page.

---

## PART 1 — WHAT IS BROKEN RIGHT NOW (PRIORITY ORDER)

### P0 — Role context is invisible
**Problem:** `EventMatches.tsx` renders completely differently for a conducteur vs passager — same URL, zero visual identity. The h1 changes but there is no persistent role badge. If a user loses track of which role they registered as, they cannot tell.

**Fix required:**
- Add a sticky role chip at the top of every carpooling page: `🚗 Conducteur` (green) or `🙋 Passager` (peach).
- The chip must be visible throughout scrolling, not just at the top of the page.
- On `EventJoin`, once a role is selected, the UI must reinforce it visually above the form.

---

### P0 — Dead space when data is missing
**Problem:** Multiple conditional renders leave ghost gaps:
```tsx
// EventMatches — driver trip summary card
{myReg.departure_address && <div>📍 ...</div>}        // may not render
{myReg.preferred_arrival && ... && <div>🕐 ...</div>} // may not render
{trunkTag && <div>🧳 ...</div>}                        // may not render
```
When all three are null, the card body is empty but the card still renders with padding — a hollow box with only the header row and seat count.

**Fix required:** Every card that can have missing content needs a fallback:
- If `departure_address` is null: show "Adresse non renseignée" in `--color-text-3`.
- If `preferred_arrival` is null or `'flexible'`: show "Horaire flexible" in `--color-text-3`.
- Never render an empty card body. Either show fallback text or collapse the section.

---

### P0 — Double back navigation (disorienting)
**Problem:** Both the global header (`AppShell`) AND individual pages (`EventJoin`, `EventMatches`) render their own back buttons pointing to the same destination. The header uses `navigate(-1)` (history), the inline button uses `navigate('/event/${shortId}')` (explicit URL). They look almost identical. Users see two "go back" affordances.

**Fix required:**
- The header back button is the source of truth for navigation. Remove the inline `← L'événement` buttons from `EventJoin` and `EventMatches`.
- If page-specific context is needed ("Retour à la fiche event"), put it in the header via the page title area, not as a duplicate button.

---

### P1 — Spacing is not on a grid
**Problem:** The codebase uses arbitrary spacing values throughout:
```
gap: 6, 8, 10, 12, 14, 16
marginBottom: 4, 6, 8, 10, 12, 14, 20, 24, 28
paddingTop: 8 (pages), 32 (MyEvents), 20 (EventMatches)
```
The result: pages feel visually inconsistent. The eye detects disorder even when the user cannot name it.

**The grid (non-negotiable):**
| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | icon ↔ label, tightest coupling |
| `--space-2` | 8px | elements within same component |
| `--space-3` | 12px | between components within a section |
| `--space-4` | 16px | between sections within a page |
| `--space-5` | 24px | between major page zones |
| `--space-6` | 32px | page top padding |
| `--space-7` | 48px | between full-page sections |

**Audit:** Every `gap`, `margin`, `padding` value must be a multiple of 4. Values like `14`, `18`, `22`, `28` are off-grid. Fix them to the nearest token.

---

### P1 — Typography hierarchy is fragmented
**Problem:** Font sizes and weights are scattered:

| Element | Current | Problem |
|---------|---------|---------|
| Page h1 | 24–28px / weight 900 | Consistent ✓ |
| Event name inline | 16px / weight 400 / serif italic | Mixed into body text — jarring |
| Section labels | 12px / weight 700 / uppercase | OK ✓ |
| Card body text | 13–14px / weight varies | 13 vs 14 inconsistent |
| Tags/pills | 11–12px | 11px is below comfortable reading |
| Distance badges | 11px / weight 700 | Too small |

**Three-level type scale (strict):**
```
Display:  24px / weight 900 / DM Sans / letter-spacing -0.5px  → h1 only
Body:     14px / weight 400–600 / DM Sans                      → content, descriptions
Label:    12px / weight 600–700 / DM Sans                      → metadata, badges, timestamps
```

**Rules:**
- Event names (Instrument Serif) are DISPLAY only: event title on its own page, event card title in lists. Never mix serif inline within a DM Sans sentence.
- Minimum rendered font size: **12px**. Tags at 11px must become 12px.
- Weight 900 for h1 only. Secondary headings use 700. Body uses 400–600.
- Never use three different font sizes within a single card.

---

### P1 — Font mixing creates jarring moments
**Problem:** `EventJoin` line 182:
```tsx
<strong style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 400 }}>
  {eventName}
</strong>
```
A serif italic string mid-sentence inside a DM Sans paragraph breaks rhythm. The size jump (14px body → 16px serif) creates a collision.

**Fix required:**
- Event name in sub-headings: use the serif at 18–20px on its own line, not inline.
- Format: small DM Sans label "Pour" above, then event name on the next line in Instrument Serif.
- Never use Instrument Serif within a sentence.

---

### P2 — Touch targets below minimum
**Problem:**
```tsx
// Toast dismiss button
padding: '2px 8px'  // renders ~22px tall — FAIL (min 44px)

// Inline cancel buttons (passenger pending state)
padding: '4px 10px'  // renders ~26px tall — FAIL

// Timeline dot in MyEvents
width: 9, height: 9  // not interactive, but visually too small
```

**Fix required:**
- Every interactive element: minimum 44×44px tap area on mobile.
- Use padding to extend the tap area if the visual must stay small.
- The Toast dismiss `×` must have `min-height: 44px, min-width: 44px` or be restructured.

---

### P2 — Loading states are text-only
**Problem:**
```tsx
<div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
  Chargement...
</div>
```
Plain text loading creates a blank stare moment. There is no structure for the eye to follow.

**Fix required:** Each page's loading state should use a skeleton that mirrors the layout it's loading:
- `EventMatches` loading: one skeleton card (header row + 3 lines of content) in the expected card shape.
- `MyEvents` loading: two skeleton event card rows with the date column.
- The spinner already exists in `AppShell` for auth — reuse that pattern at minimum.

---

### P2 — Buttons are inconsistently implemented
**Problem:** The codebase has a `Button` component with proper variants (`primary`, `secondary`, `ghost`, `danger`), but most pages use raw `<button>` elements with inline styles instead. This creates visual drift — some "secondary" actions look like the `Button` component, others are custom implementations.

**Rule:**
- `<Button>` component for all user-facing actions.
- Raw `<button>` only for icon buttons or navigation elements (back arrow, etc.).
- Every action maps to exactly one variant: `primary` for the main action, `secondary` for alternatives, `ghost` for contextual links, `danger` for destructive actions.
- Never create a new one-off button style.

---

### P2 — Missing hover and focus states on inline buttons
**Problem:** Inline `<button>` elements with `background: 'none', border: '1.5px solid var(--color-border)'` have zero hover feedback. The cursor changes to pointer but nothing visual changes.

**Fix required:** Every button needs all states:
```
default:  as designed
hover:    background: var(--color-surface-2) — subtle fill
active:   scale(0.98) — confirms press
focus:    outline: 2px solid var(--color-violet), outline-offset: 2px
disabled: opacity: 0.45, cursor: not-allowed
```
This applies to the "Refuser" / "Accepter" buttons, all navigation buttons, and the role selection cards in EventJoin.

---

## PART 2 — PLATFORM-SPECIFIC DESIGN RULES

### Rule 1: Role identity is sacred
Every carpooling page must answer "Am I a conducteur or passager?" in under 1 second without reading.

**Implementation:**
```
Conducteur chip: background #eaf5c4, color #4a8a00, border 1px solid #7cc400
Passager chip:   background #fef3eb, color #c4601a, border 1px solid #f4a261
```
Place this chip:
- Top of `EventJoin` after role selection (persistent, above the form)
- Top of `EventMatches` (always visible)
- Top of `EventConfirmed`

---

### Rule 2: Never show an empty card body
Cards exist to contain information. A card with only a header is noise.

**Mandatory fallbacks for every data field that can be null:**
```
departure_address    → "Adresse non renseignée"
preferred_arrival    → "Horaire flexible"
seats_available = 0  → "Places complètes"
trunkTag = null      → omit the row entirely (not show empty label)
constraints = []     → omit the tags section entirely (not show an empty flex row)
```

---

### Rule 3: Match cards must be scannable in 2 seconds
A passenger looking at 4 driver cards needs to decide quickly. The hierarchy of information in each card:

**Level 1 (pre-attentive):** Name + distance badge — largest, most visible
**Level 2 (secondary):** Departure address + seats available + price
**Level 3 (detail):** Car rules tags — smallest, available on demand

This hierarchy is currently violated: the `isFree ? 'Gratuit' : '~'` text is 16px/weight 900 but placed top-right where the eye doesn't land first. Move it to Level 2 with the address.

---

### Rule 4: AI matching must feel like a feature, not a list
Currently the passenger matches view is just a list of cards with "Demander à rejoindre" buttons. There is no sense that AI or intelligence has done anything.

**Minimum required UX signals:**
- A short header line: "X conducteurs sur ta route" with the distance shown prominently.
- The closest driver should have a subtle "⭐ Le plus proche" label.
- When 0 matches: explain why (no drivers in 50km radius) and offer a clear action (modify departure point).

---

### Rule 5: Pending state must dominate the screen when active
When a passenger has sent a request (`myMatchStatus === 'pending'`), they are waiting. The entire page purpose has changed from "browse" to "wait." The UI must reflect this.

**Current problem:** The pending banner is 14px-tall inline notification. The rest of the driver cards are still fully visible and actionable.

**Fix required:**
- When status is pending: visually dim all non-requested driver cards (opacity 0.4, no pointer events).
- The pending banner should expand to a prominent status card: "⏳ En attente de [driver name]" with a clear cancel affordance.
- The action button on the requested card must change to show state: spinner/pulse animation.

---

### Rule 6: Realtime events need in-viewport feedback
Currently realtime updates show a Toast at top center. This is good positioning. But:

- The Toast dismiss `×` is too small (P2, fixed above).
- The Toast auto-dismisses in 6 seconds. For critical events (match accepted, match declined), this is too fast.
- Match declined should NOT auto-dismiss — it requires action from the user (pick another driver).

**Rules:**
```
Match accepted  → Toast 6s (auto-dismiss OK, navigating away)
Match declined  → Inline banner (no auto-dismiss, user must choose new driver)
New request     → Toast 6s (driver view, informational)
Request sent    → Optimistic UI update (no toast needed, card state changes)
```

---

### Rule 7: Form sections must have consistent internal structure
`EventJoin` mixes two patterns for section labels:
1. `<SectionLabel>` component (via `Card`)
2. Inline `<p style={{ fontSize: 12, ... }}>` labels

Both render identically but one is semantic and one is not. Pick one and use it everywhere.

**Standard card section structure:**
```
<Card>
  <SectionLabel>{title}</SectionLabel>
  {/* 8px gap */}
  {content}
</Card>
```
Gap between `SectionLabel` and content: always `8px`. Gap between Cards: always `12px`.

---

## PART 3 — SPACING SYSTEM (REFERENCE)

### The 8px grid — required values only
```
4px   → icon-label gap, tightest internal spacing
8px   → within-component spacing
12px  → between sibling cards/sections
16px  → card internal padding (sides)
18px  → card internal padding (current: OK)
24px  → between major sections
32px  → page top padding
48px  → between full page zones
```

### Banned values (replace with nearest grid value)
```
6px   → use 8px
10px  → use 8px or 12px
14px  → use 12px or 16px
20px  → use 24px (or 16px if tighter context)
28px  → use 24px or 32px
```

### Page wrapper standard
```tsx
// ALL pages: consistent top padding
<div style={{ paddingTop: 32, paddingBottom: 80 }}>

// NOT:
paddingTop: 8   // EventMatches — too tight
paddingTop: 32  // MyEvents — correct
```

---

## PART 4 — COLOR USAGE RULES

### Semantic color map (strict)
```
--color-violet (#7cc400)  → Primary actions, selected states, conducteur identity
--color-peach  (#f4a261)  → Passager identity, car rules pills, warm secondary
--color-green  (#5dcaa5)  → Success, confirmed state, seat availability (good)
--color-red    (#ef4444)  → Full seats, errors, destructive actions ONLY
--color-amber  (#d97706)  → Pending/waiting states, caution
```

### Current violations:
1. Seat badge uses red (`#ef4444`) for 0 seats left — correct, but visually alarming. Use `var(--color-red-light)` background + `var(--color-red)` text instead of full red background.
2. The distance badge in driver cards uses `color` (a random COLORS array) as both background tint and text. This is inconsistent per card since the color changes per driver index. Standardize distance badges to always use `--color-surface-2` background + `--color-text-2` text.
3. `var(--color-violet)` is named "violet" but is green. This legacy alias is a code smell. New code should use `--color-primary` or `--color-green-action` (defined as `#7cc400`). Add a comment in `index.css` to prevent confusion.

---

## PART 5 — NAVIGATION RULES

### Back button contract
- One back affordance per page, from the global header.
- The header back button uses `navigate(-1)`. This is correct.
- Pages must NOT add their own back buttons that duplicate this.
- **Exception:** If a page is an entry point (accessed via link, no history), the header back button will show but navigate to a wrong place. In this case, the page can add a contextual link that is visually distinct from the header: e.g., a text link "← Voir l'événement" in the page hero, not as a button.

### Page title hierarchy
```
Header (60px):   Bivio logo + nav + auth — persistent context
Page h1 (24px):  "Ton trajet conducteur" — current page identity
Sub-line (14px): "Pour [Event name]" — parent context
Role chip (12px): "🚗 Conducteur" — persistent role identity
```

This 4-level hierarchy should be present on all carpooling pages.

### URL → Page identity mapping (must be communicated)
| URL | Who sees what | Role indicator needed |
|-----|---------------|----------------------|
| `/event/:id/join` | Everyone | After role selection: yes |
| `/event/:id/matches` | Conducteur OR Passager | YES — always |
| `/event/:id/confirmed` | Accepted passager or confirming conducteur | YES |

---

## PART 6 — EMPTY STATES

### Empty state template
Every empty state must answer three questions:
1. **What's missing?** — clear headline
2. **Why is it missing?** — brief explanation
3. **What should I do?** — single CTA

### Required empty states audit
| Page | State | Current | Required |
|------|-------|---------|----------|
| EventMatches (driver, no requests) | Waiting | ✓ good | Add: share link to invite drivers |
| EventMatches (passenger, no matches) | No drivers | ✓ good | Add: suggest modifying departure address |
| EventMatches (passenger, pending) | Waiting | Partial | Improve: full-screen waiting state |
| MyEvents (no events) | First time | ✓ good | — |
| MyEvents (upcoming tab empty) | No upcoming | ✓ minimal | Add emoji + CTA to create event |

### Dead space rule
If ANY of the following is null, the parent container must adapt:
```
departure_address: null → "Adresse non renseignée" (italic, text-3)
preferred_arrival: 'flexible' → "Horaire flexible"
seats_available: 0 → "Complet" badge (red)
constraints: [] → hide the Tags section entirely
```
Never let optional content create irregular gaps. Use `gap` on flex containers (not margins on children) so removal of an item doesn't leave whitespace.

---

## PART 7 — AUDIT CHECKLISTS

### Run before shipping any page

#### Identity & Context
```
□ Can I tell within 1 second what role I'm in (conducteur/passager)?
□ Does the page title match what is actually displayed?
□ Is the parent event context visible without scrolling?
□ Is there exactly ONE back navigation affordance visible?
□ If I arrived via direct link (no history), does back navigation work correctly?
```

#### Spacing
```
□ Are all spacing values on the 4px grid (multiples of 4)?
□ Does paddingTop: 32 apply to all page wrappers?
□ Is gap: 12 used between sibling cards?
□ Is gap: 8 used within components?
□ Is gap: 16 used as card internal padding?
```

#### Typography
```
□ Is h1 the only element using fontWeight 900?
□ Is Instrument Serif used only for event names (standalone, not inline)?
□ Is the minimum font size 12px across all text?
□ Are there at most 3 levels of typographic hierarchy on this page?
□ Are all section labels using the <SectionLabel> component (not inline <p>)?
```

#### Color
```
□ Is red used ONLY for errors, destructive actions, or full/blocked states?
□ Is green (var(--color-green)) used ONLY for success/confirmed states?
□ Is amber used ONLY for pending/waiting states?
□ Does every color-coded state also have a text/icon fallback?
□ Are distance badges consistent (same color treatment across all drivers)?
```

#### Empty & Missing Data
```
□ Does every card handle null departure_address gracefully?
□ Does every card handle null/flexible preferred_arrival gracefully?
□ Does every card handle empty constraints array gracefully (no empty flex row)?
□ Is there zero dead whitespace when optional fields are missing?
□ Does every empty state have: headline + explanation + CTA?
```

#### Interactions
```
□ Does every button have hover, active, focus, and disabled states?
□ Are all touch targets minimum 44×44px?
□ Does every button use the <Button> component (not raw inline-styled <button>)?
□ Is there visual feedback within 100ms of every user action?
□ Does every async action have a loading state on its trigger button?
```

#### Real-time & Feedback
```
□ Are success toasts dismissible?
□ Do critical notifications (match declined) require user action before dismissing?
□ Is optimistic UI applied? (state updates immediately, server confirms async)
□ If a realtime update fails, does the UI recover gracefully?
```

#### Responsive
```
□ Are all touch targets 44×44px on mobile?
□ Does no content overflow the viewport horizontally?
□ Does the role chip remain visible while scrolling on mobile?
□ Are all Cards full-width on mobile?
```

---

## PART 8 — SPECIFIC CODE FIXES (PRIORITIZED)

### Fix 1 — Add role chip component
Create `/src/components/RoleChip.tsx`:
```tsx
// Conducteur: green | Passager: peach
```
Use in: `EventJoin` (post-selection), `EventMatches` (always), `EventConfirmed`.

### Fix 2 — Standardize page wrapper
All pages should open with:
```tsx
<div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
```
Not `paddingTop: 8` (EventMatches), not `paddingTop: 0` (implied elsewhere).

### Fix 3 — Add fallback text to trip summary
In `EventMatches` driver view, add fallback to every conditional:
```tsx
<div>📍 {myReg.departure_address ?? <em style={{color:'var(--color-text-3)'}}>Non renseignée</em>}</div>
```

### Fix 4 — Remove redundant back buttons
Delete the inline `← L'événement` `<button>` from `EventJoin` (line 170–175) and `EventMatches` passenger view (line 422–427). The header handles this.

### Fix 5 — Fix Tags minimum font size
In `Tags` component (`EventMatches.tsx` line 39):
```
fontSize: 11  →  fontSize: 12
```

### Fix 6 — Fix Toast dismiss touch target
```tsx
// Current: padding: '2px 8px' — ~22px tall
// Fix:
padding: '10px 12px', minWidth: 44, minHeight: 44
```

### Fix 7 — Event name on separate line
In `EventJoin` (line 181–183), break the event name onto its own line:
```tsx
<div style={{ paddingBottom: 24 }}>
  <h1 style={{ fontSize: 24, fontWeight: 900 }}>Ton trajet</h1>
  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>Pour</p>
  <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: 'var(--color-text)' }}>
    {eventName}
  </p>
</div>
```

### Fix 8 — Dim non-requested driver cards when pending
In `EventMatches` passenger view:
```tsx
style={{
  ...existingCardStyle,
  opacity: myMatchStatus === 'pending' && !isRequested ? 0.4 : 1,
  pointerEvents: myMatchStatus === 'pending' && !isRequested ? 'none' : 'auto',
}}
```

---

## PART 9 — DESIGN QUESTIONS TO FLAG ANY WRONGDOING

Ask these before every UI decision. If you can't answer all of them, the design is not ready.

### Role & Context
1. Can a first-time user on this page tell within 1 second whether they are a conducteur or passager?
2. If a user arrives via a direct link (no navigation history), does the page make sense without prior context?
3. Does the page title accurately describe what is being shown?
4. Is the event name visible on all carpooling sub-pages without scrolling?

### Spacing & Layout
5. Is every spacing value a multiple of 4?
6. Is there a logical visual grouping — elements that belong together are closer to each other than to unrelated elements?
7. Are there any places where removing an optional element would leave a visual gap or dead space?
8. Is padding consistent across sibling cards (same internal padding on all cards in a list)?

### Typography
9. Is Instrument Serif used standalone (not inline within a DM Sans sentence)?
10. Is every text element at minimum 12px?
11. Is fontWeight 900 used only for h1 elements?
12. Are there more than 3 typographic levels visible on this page at once?

### Color
13. Is any red used for something other than an error, block, or destructive action?
14. Are all semantic colors used consistently across every page?
15. If color were removed entirely (grayscale), could the user still understand the state of every element?
16. Do all text elements pass WCAG AA contrast (4.5:1 for body, 3:1 for large text)?

### Empty & Missing States
17. What happens to this card/section if every optional field is null?
18. Does every list have an empty state that explains what to do next?
19. Is there any place where "no data" creates a confusing blank area?

### Interactions & Feedback
20. Does every button have hover, active, focus, and disabled states?
21. Is every interactive element at least 44×44px on mobile?
22. Does the UI update immediately when the user takes an action, even before the server responds?
23. If an async action fails, does the UI recover and explain what happened?
24. Is there more than one back navigation affordance visible at the same time?

### Real-time
25. If a realtime notification fires while the user is scrolled down, will they see it?
26. Does a match declined notification require user acknowledgment (not auto-dismiss)?
27. Is the pending state visually dominant when the user is waiting for confirmation?

### Navigation
28. Is there a clear and unambiguous path forward from this page?
29. Is there a clear and unambiguous path backward from this page?
30. If the user refreshes the page, will they land in the correct state?

### Consistency
31. Are all buttons using the `<Button>` component (not one-off inline styles)?
32. Are all section headings using `<SectionLabel>` (not inline `<p>` with weight 700)?
33. Are all cards using the `<Card>` component with consistent padding?
34. Is the loading state consistent with the rest of the app (spinner, not text)?

---

*Last updated: 2026-04-02*
*Stack: Vite + React 19 + TypeScript + Tailwind v4 + Supabase*
