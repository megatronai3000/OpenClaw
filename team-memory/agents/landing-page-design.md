# Agent Team Landing Page - Design Document
**Designed by:** Petty (Design Lead)  
**Date:** 2026-02-10  
**Task ID:** agent-team-landing-page

---

## 1. Page Structure & Layout

### Wireframe Description

```
┌─────────────────────────────────────────┐
│  NAV (sticky)                           │
│  🤖 Executive Agent Team          [Menu] │
├─────────────────────────────────────────┤
│                                         │
│  HERO SECTION                           │
│  ┌─────────────────────────────────┐   │
│  │  Your AI Executive Team         │   │
│  │                                 │   │
│  │  Autonomous specialists working │   │
│  │  24/7 to research, design, and  │   │
│  │  build—coordinated by Megatron, │   │
│  │  your Chief of Staff.           │   │
│  │                                 │   │
│  │  [View Work Queue] [Meet Team]  │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ACTIVE AGENTS (3 cards)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ 🤖       │ │ 🎨       │ │ 🔍       ││
│  │ Megatron │ │ Petty    │ │ Scout    ││
│  │ Chief of │ │ Design   │ │ Research ││
│  │ Staff    │ │ Lead     │ │ Lead     ││
│  │ [Active] │ │ [Active] │ │ [Soon]   ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  CURRENT WORK (3-5 recent tasks)        │
│  ┌───────────────────────────────────┐ │
│  │ 🟡 HIGH   DDI Design Review       │ │
│  │    Petty • 23:15 • $0.02          │ │
│  ├───────────────────────────────────┤ │
│  │ 🟡 HIGH   Landing Page Design     │ │
│  │    Petty • 23:30 • $0.03          │ │
│  ├───────────────────────────────────┤ │
│  │ 🟢 MED    Scout Recruitment       │ │
│  │    Megatron • 23:30 • $0.02       │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  SYSTEM STATUS                          │
│  ┌───────────────────────────────────┐ │
│  │ Daily Budget: $0.16 / $10.00 ✅   │ │
│  │ Last Check: 23:33 EST             │ │
│  │ Next: 00:03 EST (30 min)          │ │
│  │ Status: Autonomous mode active    │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  CTA SECTION                            │
│  ┌───────────────────────────────────┐ │
│  │ Add Task to Queue                 │ │
│  │ [Text input with priority select] │ │
│  │ [Submit]                          │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  FOOTER                                 │
│  Autonomous Agent Team • OpenClaw      │
└─────────────────────────────────────────┘
```

### Layout Principles
- **Single-column, mobile-first:** Stacks perfectly on mobile
- **Card-based:** Clear visual hierarchy
- **Sticky nav:** Always accessible
- **Scrollable work queue:** Shows 3-5 most recent, scroll for more

---

## 2. Visual Design Direction

### Color Palette

**Primary:**
- Background: `#0f0f0f` (near-black, premium feel)
- Surface: `#1a1a1a` (elevated cards)
- Border: `#2a2a2a` (subtle separation)

**Accent:**
- Primary Action: `#3b82f6` (blue, trustworthy)
- Success/Active: `#10b981` (green, healthy)
- Warning/Medium: `#f59e0b` (amber, attention)
- High Priority: `#ef4444` (red, urgent)

**Text:**
- Primary: `#ffffff` (white, on dark)
- Secondary: `#a1a1aa` (muted gray)
- Tertiary: `#71717a` (very muted)

### Typography

**Font Stack:**
- Primary: `Inter, -apple-system, sans-serif` (clean, modern)
- Monospace: `JetBrains Mono, monospace` (for status, timestamps)

**Hierarchy:**
- Hero: 48px / 600 weight / -0.02em letter-spacing
- H2: 24px / 600 weight
- H3: 18px / 500 weight
- Body: 16px / 400 weight / 1.6 line-height
- Caption: 14px / 400 weight
- Status: 12px / monospace

### Vibe & Feel

**Editorial, authoritative, quietly confident.**

- **Dark mode by default:** Feels like a dashboard, not a marketing site
- **Generous whitespace:** Breathable, not cramped
- **Subtle animations:** Hover states on cards, smooth transitions
- **Status indicators:** Color-coded for quick scanning
- **Emoji accents:** Personality without being unprofessional

---

## 3. Content Sections

### Hero Section
**Headline:** "Your AI Executive Team"  
**Subheadline:** "Autonomous specialists working 24/7 to research, design, and build—coordinated by Megatron, your Chief of Staff."  
**CTAs:**
- Primary: "View Work Queue" → scrolls to work section
- Secondary: "Meet the Team" → scrolls to agents

### Active Agents Section
**Headline:** "Active Agents"  
**Cards (one per agent):**
- Avatar (emoji + colored background)
- Name + Role
- Status badge (Active/Recruiting/Planning)
- Brief description (1 line)
- Click → agent detail view

**Current Agents:**
1. **Megatron** 🤖 — Chief of Staff — Active
2. **Petty** 🎨 — Design Lead — Active  
3. **Scout** 🔍 — Research Lead — Recruiting Soon

### Current Work Section
**Headline:** "Current Work"  
**Task List Items:**
- Priority indicator (color dot)
- Task name
- Assigned agent
- Timestamp
- Estimated cost
- Status (pending/in-progress/complete)

### System Status Section
**Headline:** "System Status"  
**Metrics:**
- Daily budget (progress bar + numbers)
- Last autonomous check
- Next scheduled check
- Overall status (healthy/warning/critical)

### Add Task Section
**Headline:** "Add Task to Queue"  
**Form:**
- Task description (textarea)
- Priority select (Low/Medium/High)
- Assign to (auto/Megatron/Petty/Scout)
- Submit button

---

## 4. Mobile-First Approach

### Breakpoints
- **Mobile:** < 640px (single column, full-width cards)
- **Tablet:** 640-1024px (2-column agent grid)
- **Desktop:** > 1024px (max-width 1200px, centered)

### Mobile Optimizations
- Cards stack vertically
- Horizontal scroll for agent grid (if needed)
- Touch-friendly tap targets (min 44px)
- Collapsible sections (accordion for work queue)
- Bottom sticky "Add Task" button

### Responsive Behavior
```
Mobile (<640px):
┌────────────────┐
│ Nav            │
├────────────────┤
│ Hero (compact) │
├────────────────┤
│ Agents         │
│ (vertical      │
│  scroll)       │
├────────────────┤
│ Work Queue     │
│ (accordion)    │
├────────────────┤
│ Status         │
├────────────────┤
│ Add Task       │
│ (sticky btn)   │
└────────────────┘

Tablet (640-1024px):
┌────────────────────┐
│ Nav                │
├────────────────────┤
│ Hero               │
├────────────────────┤
│ Agents (2-col)     │
│ [🤖] [🎨]          │
│ [🔍] [...]         │
├────────────────────┤
│ Work + Status      │
│ (side by side)     │
├────────────────────┤
│ Add Task           │
└────────────────────┘

Desktop (>1024px):
┌──────────────────────────┐
│ Nav (max-width 1200px)   │
├──────────────────────────┤
│ Hero                     │
├──────────────────────────┤
│ Agents (3-col grid)      │
├──────────────────────────┤
│ Work Queue    │ Status   │
│ (2/3 width)   │ (1/3)    │
├──────────────────────────┤
│ Add Task                 │
└──────────────────────────┘
```

---

## 5. Interactions & States

### Hover States
- **Cards:** Subtle lift (translateY -2px), shadow increase
- **Buttons:** Brightness increase, optional scale(1.02)
- **Links:** Underline animation (left to right)

### Loading States
- Task submission: Spinner in button, disabled state
- Status updates: Skeleton loaders for cards

### Empty States
- No work: "All caught up! 🎉 Agents are standing by."
- No agents: "Recruiting team... Check back soon."
- Budget exceeded: "Daily budget reached. Resume tomorrow."

### Error States
- Failed task: Red banner, retry button
- System error: Yellow warning, escalate to human

---

## 6. Implementation Notes

### Tech Stack Recommendation
- **Static site:** HTML + CSS (Tailwind) + minimal JS
- **Hosting:** GitHub Pages or Vercel (free)
- **Data:** Read from markdown files (work-queue.md, etc.)
- **Build:** Simple script to parse markdown → HTML

### File Structure
```
landing-page/
├── index.html              # Main page
├── styles.css              # Tailwind or custom
├── agents.js               # Agent data (from YAML)
├── tasks.js                # Task data (from work-queue.md)
└── status.js               # Status data (from budget-tracker.md)
```

### Design Tokens
Create `design-tokens.css`:
```css
:root {
  --bg-primary: #0f0f0f;
  --bg-surface: #1a1a1a;
  --border: #2a2a2a;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
  --accent-red: #ef4444;
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
}
```

---

## 7. Design Rationale

**Why dark mode?**
- Feels like a dashboard/tool, not a brochure
- Easy on eyes for frequent checking
- Status colors pop more

**Why cards?**
- Scannable at a glance
- Easy to reorder/prioritize
- Clear boundaries between sections

**Why emoji avatars?**
- Personality without custom illustration
- Consistent with team communication style
- Quick visual identification

**Why mobile-first?**
- You'll check this on phone while away from desk
- Forces prioritization of information
- Easier to scale up than scale down

---

**Bottom line:** This should feel like a mission control dashboard—informative, scannable, and quietly confident about the autonomous work happening behind the scenes.

— Petty 🎨
