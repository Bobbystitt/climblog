# ClimbLog — Project Briefing for Claude Code

Read this file at the start of every session before touching any code.

---

## What the App Does & Who It's For

**ClimbLog** is a mobile-first climbing logbook and gym management app for boulderers.

**For Climbers:**
- Log climbing sessions (grade, attempts, difficulty rating, fun rating, notes)
- Browse gyms and climbs with advanced filtering (grade range, style tags, status, favorites)
- Track ascent status: flashed (sent in 1 try), sent (multiple tries), project (unsent but logged)
- View personal stats: total sends by grade, top grade, session history
- Photo gallery per climb with pinch-to-zoom viewer

**For Setters & Admins:**
- Create and edit climbs (grade, hold color, style tags, description, photo)
- Upload and manage gym hero images
- View gym-wide grade distribution and stats

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI Library | React 19 |
| Language | **JavaScript only — no TypeScript** |
| Styling | Tailwind CSS 4 |
| Database / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Charts | Recharts |
| Font | **Poppins** (Google Fonts, weights 400/500/600/700) |

---

## Folder Structure

```
/climblog
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout (font, metadata)
│   ├── page.js                 # Root redirect: auth → /dashboard or /login
│   ├── globals.css             # Tailwind imports only
│   ├── climb/
│   │   ├── new/page.js         # Create climb (setter/admin only)
│   │   ├── [id]/page.js        # Climb detail: log ascents, photo, metadata
│   │   └── [id]/edit/page.js   # Edit climb (setter/admin only)
│   ├── gym/
│   │   ├── [id]/page.js        # Gym landing: hero, stats, grade chart, zones, favorites
│   │   └── [id]/discover/page.js  # Gym-wide climb browse with filter-first flow
│   ├── zone/
│   │   └── [id]/page.js        # Zone detail: climb list, filter, add FAB for setters
│   ├── logbook/
│   │   ├── page.js             # Session list: ascents grouped by date
│   │   └── [date]/page.js      # Session detail: ascents for a specific date
│   ├── profile/
│   │   ├── page.js             # Profile: avatar, stats, session chart
│   │   └── edit/page.js        # Edit profile: name, username, avatar
│   ├── dashboard/
│   │   └── page.js             # Gym list; saves "savedPath" for Home resume
│   ├── login/page.js           # Auth login form
│   ├── signup/page.js          # Auth signup form
│   └── components/             # Shared/reusable components
│       ├── BottomNav.js        # 3-tab bottom nav: Home, Logbook, Profile
│       ├── ClimbCard.js        # Climb list item: grade badge, tags, status, actions
│       ├── FilterDrawer.js     # Bottom sheet: grade slider, status, tags, favorites
│       └── GradeBadge.js       # Colored square with grade text
├── constants/
│   ├── colors.js               # CLIMB_COLORS map, climbColor(), COLOR_OPTIONS
│   └── grades.js               # V_GRADE_ORDER, GRADE_SCALE, GRADE_SCALE_MAX, CHART_GRADES, GRADE_HEX
├── hooks/
│   └── useAuth.js              # Auth check hook; redirects to /login if no session
├── lib/
│   ├── supabase.js             # Supabase client initialisation
│   └── queries.js              # All database queries (gyms, zones, climbs, profiles, ascents, favorites)
├── supabase/
│   └── favorites.sql           # favorites table schema + RLS policies
└── public/                     # Static assets
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Page files | lowercase, file-based route | `page.js`, `[id]/page.js` |
| Component files | PascalCase | `ClimbCard.js`, `FilterDrawer.js` |
| Hook files | camelCase with `use` prefix | `useAuth.js` |
| Utility/lib files | camelCase | `queries.js`, `supabase.js` |
| JS variables & functions | camelCase | `attemptCount`, `handleSubmit` |
| JS constants | UPPER_SNAKE_CASE | `V_GRADE_ORDER`, `GRADE_SCALE_MAX` |
| Database tables | lowercase snake_case | `climbs`, `ascents`, `gyms` |
| Database columns | snake_case | `gym_id`, `climb_id`, `climbed_at` |
| CSS | Tailwind utility classes only | `bg-zinc-900 text-zinc-100` |
| Component props | camelCase, descriptive | `climbStatus`, `isFavorited`, `onLogAscent` |

---

## Key Architectural Decisions

### State Management
- React local state only (`useState`, `useEffect`, `useRef`)
- No global state manager (no Context, no Redux, no Zustand)
- Each page fetches its own data on mount

### Data Fetching
- All queries live in `lib/queries.js` — never write raw Supabase calls inside components
- Use `Promise.all()` for parallel independent queries
- Return `data ?? []` (or `null`) — never throw; handle errors via return value checks

### Routing
- Next.js App Router (file-based)
- Use `router.push()` from `next/navigation` — **never `router.back()`**
- Always navigate to explicit named paths (e.g. `router.push('/gym/' + gymId)`)

### Authentication
- Supabase Auth (email/password)
- `useAuth()` hook: checks session on mount, redirects to `/login` if unauthenticated
- Auth checks always run inside `useEffect`, never during render

### localStorage
- **All localStorage reads and writes must happen inside `useEffect`**, never during render or SSR
- Used keys: `savedPath` (last visited gym/zone/climb URL), `resumeActive` (flag for resume banner)

### Images
- Supabase Storage buckets: `climb-photos`, `gym-images`, `avatars`
- Path patterns:
  - Climbs: `{zoneId}/{timestamp}.{ext}`
  - Gym hero: `{gymId}-{timestamp}.{ext}`
  - Avatars: `{userId}/avatar.{ext}`
- Always use `getPublicUrl()` to generate display URLs

---

## Rules — Always Follow

### No TypeScript
The project is JavaScript only. Never create `.ts` or `.tsx` files. Never add type annotations.

### Font: Poppins
Poppins is the sole UI font. Every page component must load and apply it:
```js
import { Poppins } from 'next/font/google'
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
// Apply to root element:
<div className={poppins.className}>
```
Never rely on Geist (the layout.js default) for any page content.

### Never Use `router.back()`
Always push to an explicit named route. `router.back()` breaks on direct load and causes bad UX. Example:
```js
// WRONG
router.back()
// CORRECT
router.push('/gym/' + gymId)
```

### localStorage Inside useEffect Only
Reading or writing localStorage during render or in server context will throw. Always guard:
```js
useEffect(() => {
  const saved = localStorage.getItem('savedPath')
  // ...
  localStorage.setItem('savedPath', path)
}, [])
```

### Minimum Attempts in Modal is 1
The attempts/tries field when logging an ascent must never go below 1. Enforce with:
```js
setAttempts(prev => Math.max(1, prev - 1))
```
The initial value must also be `Math.max(1, initialAttempts)`.

### Role-Based Access: setter and admin
Only `setter` and `admin` roles may create/edit climbs or upload gym images. Check like this:
```js
if (profile?.role === 'setter' || profile?.role === 'admin') {
  // show controls
}
```
Never check role during render — always inside `useEffect` after fetching the profile.

### Queries in lib/queries.js
Never write `supabase.from(...)` calls inside page or component files. Add new queries to `lib/queries.js` and import them.

---

## Color Map — `constants/colors.js`

Hold color name → hex (used for GradeBadge backgrounds and ClimbCard display):
```js
CLIMB_COLORS = {
  red:    '#C0392B',
  blue:   '#2471A3',
  green:  '#1E8449',
  yellow: '#D4AC0D',
  orange: '#CA6F1E',
  purple: '#7D3C98',
  pink:   '#C0527A',
  white:  '#D5D8DC',
  gray:   '#707B7C',
  black:  '#2C3E50',
  tan:    '#C4A882',
}
```
Use the helper: `climbColor(colorString)` — returns the hex or `'#52525b'` as fallback.

Valid color values for the `climbs.color` DB column: `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `pink`, `white`, `gray`, `black`, `tan`.

---

## Grade Ordering — `constants/grades.js`

```js
// Full V-grade order for sorting and chart display
V_GRADE_ORDER = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15','V16','V17']

// Grade scale for the filter slider (VB–V10)
GRADE_SCALE = ['VB','V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10']
GRADE_SCALE_MAX = 11  // GRADE_SCALE.length - 1

// Grades shown on gym distribution chart
CHART_GRADES = ['VB','V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10']

// Hex colors per grade for bar charts (green → red → purple → blue/teal)
GRADE_HEX = {
  VB: '#15803d',
  V0: '#16a34a', V1: '#22c55e', V2: '#84cc16',
  V3: '#eab308', V4: '#fb923c', V5: '#f97316',
  V6: '#ef4444', V7: '#dc2626', V8: '#be123c',
  V9: '#be185d', V10: '#9333ea', V11: '#7e22ce',
  V12: '#6d28d9', V13: '#4338ca', V14: '#1d4ed8',
  V15: '#0369a1', V16: '#0e7490', V17: '#0f766e',
}
```

---

## Supabase Table Structure

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | references `auth.users` |
| `role` | text | `'user'` \| `'setter'` \| `'admin'` |
| `first_name` | text | optional |
| `last_name` | text | optional |
| `username` | text | optional, unique |
| `avatar_url` | text | optional, Supabase Storage URL |
| `updated_at` | timestamptz | |
| `created_at` | timestamptz | default now() |

### `gyms`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `location` | text | optional |
| `description` | text | optional |
| `hero_image_url` | text | optional, Supabase Storage URL |
| `created_at` | timestamptz | default now() |

### `zones`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `gym_id` | uuid FK | references `gyms` |
| `name` | text | |
| `description` | text | optional |
| `created_at` | timestamptz | default now() |

### `climbs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `zone_id` | uuid FK | references `zones` |
| `grade` | text | e.g. `'VB'`, `'V0'`–`'V17'` |
| `color` | text | one of the 11 hold colors (see Color Map) |
| `tags` | text[] | e.g. `['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']` |
| `description` | text | optional |
| `photo_url` | text | optional, Supabase Storage URL |
| `repeat_count` | int | default 0; incremented when any user logs an ascent |
| `created_at` | timestamptz | default now() |

### `ascents`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | references `auth.users` |
| `climb_id` | uuid FK | references `climbs` |
| `tries` | int | minimum 1; 1 = flashed if status = 'sent' |
| `status` | text | `'sent'` \| `'project'` |
| `climbed_at` | timestamptz | timestamp of the attempt |
| `difficulty_rating` | int | 0–5, optional (orange stars in UI) |
| `rating` | int | 0–5, optional fun rating (yellow stars in UI) |
| `notes` | text | optional |
| `created_at` | timestamptz | default now() |

**Derived UI status:**
- `status === 'sent' && tries === 1` → displays as **Flashed** (blue badge)
- `status === 'sent' && tries > 1` → displays as **Sent** (green badge)
- `status === 'project'` → displays as **Project** (yellow badge)

### `favorites`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | references `auth.users` |
| `climb_id` | uuid FK | references `climbs` |
| `created_at` | timestamptz | default now() |

Unique constraint on `(user_id, climb_id)`.

---

## Component Patterns

### ClimbCard
```js
<ClimbCard
  climb={climbObj}              // { id, grade, color, tags, repeat_count, zoneName? }
  climbStatus="flashed|sent|project|untouched"
  isFavorited={boolean}
  onLogAscent={(climb) => {}}
  onToggleFavorite={(climbId) => {}}
  showBorder={boolean}          // render top border if not first in list
/>
```

### FilterDrawer
```js
<FilterDrawer
  open={boolean}
  onClose={() => {}}
  onApply={({ gradeRange: [min, max], tags: [], favorites: bool, status: string }) => {}}
  activeGradeRange={[0, GRADE_SCALE_MAX]}
  activeTags={[]}
  activeFavorites={false}
  activeStatus="All|Flashed|Sent|Projects"
/>
```

### Modal pattern
```js
function SomeModal({ open, onClose, onSaved, ...data }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-50 p-6">
        {/* form content */}
      </div>
    </>
  )
}
```

### Loading spinner
```js
<div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
```

### Skeleton placeholder
```js
<div className="h-X w-Y rounded-Z bg-zinc-900 animate-pulse" />
```

---

## UI Design Conventions

- **Theme:** Dark background (`bg-zinc-950`, `bg-zinc-900`), light text (`text-zinc-100`, `text-zinc-400`)
- **Primary accent:** `indigo-500` / `indigo-600`
- **Danger / remove:** `rose-500`
- **Status badge backgrounds:** flashed = `rgba(59,130,246,0.10)`, sent = `rgba(34,197,94,0.10)`, project = `rgba(234,179,8,0.10)`
- **Z-index layers:** floating buttons `z-30`, backdrop `z-40`, modal sheet `z-50`
- **Optimistic UI:** toggle favorites and increment repeat count locally before DB confirms
- **Toast (success):** fixed `top-16`, auto-dismiss after 2500ms

---

## Bottom Navigation

Three tabs: **Home** (resumes to `localStorage.savedPath` or `/dashboard`), **Logbook**, **Profile**.
Clicking Home always reads `savedPath` from localStorage inside a click handler — this is a deliberate exception to the useEffect rule because it's an event handler, not render-time access.
