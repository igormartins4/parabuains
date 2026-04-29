# Feature Landscape — Parabuains

**Domain:** Social birthday reminder platform
**Researched:** 2026-04-29
**Confidence:** HIGH (triangulated against BirthdayAlarm, GroupGreeting, Kudoboard, Gifted.co, MyBirthday.Ninja, and first-principles social network patterns)

---

## Table Stakes

Features users expect. Absence causes abandonment or refusal to sign up.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Account creation (email/OAuth) | Zero friction to join; OAuth especially expected by mobile-first users | Low | Google + social OAuth required; email/password as fallback |
| Birthday profile (name, photo, date) | Core data model; without it the product has nothing to remind | Low | Year of birth optional — many users hide age but share month/day |
| Public profile page at `/username` | Social sharing is the growth loop; without shareable URL nobody invites friends | Low-Med | Slug uniqueness, vanity URLs, OG meta tags for good link previews |
| Friends list / bilateral follow | Users need to manage whose birthdays they track; bilateral trust fits intimate context vs. asymmetric follow | Med | Requests, accept/deny, mutual unfriend; consider "pending" state clearly |
| Birthday feed (upcoming friends' birthdays) | The core daily/weekly utility: "who has birthdays coming up?" | Med | Sort by proximity to today; highlight today's birthdays prominently |
| Countdown on profile page | Instant social signal; visitors see "X days until birthday" which creates anticipation | Low | Calculate against current server date; handle leap years |
| Email notifications before birthday | Users' primary reason to give their email; must arrive at least 1 day before | Med | Configurable timing (7d, 3d, 1d); unsubscribe one-click; deliverability matters |
| Web push notifications | Expected on mobile web; replaces need for SMS/WhatsApp in v1 | Med | Service worker + VAPID keys; explicit opt-in UX critical for conversion |
| Public message wall (congrats board) | Core social moment — seeing friends write "happy birthday" is the emotional payoff | Med | Needs moderation/reporting; anonymous vs. named posts configurable |
| Privacy controls (public / friends-only / private) | Without this, users won't enter real birthday; privacy = trust signal | Med | Granular enough to satisfy both open and private users |
| Mobile-first responsive design | Majority of social interactions happen on mobile; non-negotiable for retention | Low | Already planned; critical for feed browsing and posting |
| Password reset / account recovery | Operational requirement; users forget passwords | Low | Standard email-based reset flow |

---

## Differentiators

Features that set Parabuains apart. Not baseline-expected, but drive love, retention, and word-of-mouth.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Private/anonymous messages to birthday person | Safe space to send heartfelt notes without public display; popular for shy or emotionally close relationships | Med | "Anonymous" hides sender identity but platform knows it (abuse prevention); moderation needed |
| Countdown widget / shareable badge | "Share your countdown" to Instagram Stories, WhatsApp status, etc. creates organic growth loop | Med | Generate an OG image or PNG badge with countdown; /username.png endpoint or canvas render |
| Notification digest ("This week's birthdays") | Weekly digest email is low-noise but high-value; keeps platform top-of-mind without push spam | Low | Cron + email template; users should be able to opt out of individual digest types |
| Belated birthday note / catch-up mode | "Oops, I missed it" — many users discover they forgot; a gentle post-birthday window (e.g. 3 days) keeps engagement real rather than performative | Low | Show "recent birthdays" in feed; allow messages up to 3 days after |
| Year hidden by default (month+day only) | Cultural expectation in many markets; many people don't want to broadcast their age | Low | Store full date server-side; display year only if user opts in |
| "Who shares my birthday" discovery | Fun viral hook — see which friends or famous people share your date | Med | Famous birthdays DB (public data); friend matching is immediate |
| One-click "send wishes" button | Frictionless act of wishing; lowers barrier so more people actually post | Low | Pre-filled "Happy birthday!" with optional edit; sends to wall |
| Notification preview in email ("João turns 30 on Friday") | Adds urgency and personalization; not just "a birthday is coming" | Low | Requires storing year if user allows; graceful degradation without year |
| Profile "wish list" or gift ideas field | Let the birthday person hint what they want; turns the page into a gift-planning resource | Med | Free-text or URL links; no commerce integration needed in v1 |
| Birthday stats / history ("40 wishes received in 2025") | Gamification-lite; makes the profile feel alive across years | Med | Aggregate counts; spark curiosity/sharing |

---

## Anti-Features

Things to deliberately **not** build in v1. These add cost, complexity, or compromise the product's focused value proposition.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| WhatsApp / SMS integration | Meta API approval is expensive and slow; SMS costs money per message; adds ops complexity | Push + email cover the use case for v1; revisit in v2 when monetization justifies cost |
| Native iOS/Android app | Doubles the maintenance surface; web push on mobile web covers most notification use cases | Invest in PWA quality (installable, offline shell, smooth animations) |
| Full social feed / timeline | Feature creep into Facebook territory; undermines focused birthday identity | Keep feed scoped to "upcoming birthdays only"; no status posts, no life updates |
| Reactions/likes on messages | Adds hollow engagement mechanics without depth; encourages low-effort interaction | Keep message wall text-focused; quality > quantity |
| AI-generated birthday message suggestions | Devalues the authenticity of the social moment; users want genuine messages | The friction of writing is the point; remove friction elsewhere (e.g. pre-fill template, one-click) |
| In-app gift purchasing / e-commerce | High operational complexity (logistics, returns, payments, curation); outside core competency | Suggest external links (Amazon wishlist, etc.) if any gift feature is added |
| Public ranking / leaderboards ("Most popular birthdays") | Gamification that creates anxiety and social comparison; alienates introverts | Focus on personal connection, not competition |
| Group birthdays / events | Scope creep; event management is a whole product (Eventbrite, Facebook Events) | Keep it personal (one birthday person, many well-wishers) |
| Calendar import for non-friend birthdays | Privacy risk; turns platform into a mass surveillance tool | Bilateral friendship ensures both parties consent |
| Ads in v1 | Degrades first impressions; hard to remove once trained into the UX; kills premium upsell potential | Focus on clean experience; monetize via premium features in v2 |

---

## Feature Dependencies

```
OAuth / email auth
  └── User profile
        ├── Birthday date
        │     ├── Countdown display
        │     ├── Feed calculation (upcoming birthdays)
        │     ├── Email notification scheduler
        │     └── Push notification scheduler
        ├── Public profile page (/username)
        │     ├── Message wall (public congrats)
        │     ├── Anonymous/private messages
        │     └── Privacy controls
        └── Friendship system (bilateral)
              ├── Friend feed
              ├── Birthday notifications (friends only)
              └── "Who shares my birthday" (friends scope)

Notification system (email)
  └── Depends on: user birthday data, friendship data, notification preferences

Notification system (web push)
  └── Depends on: service worker, VAPID setup, explicit opt-in UX
```

**Critical path for v1 launch:**
1. Auth → Profile (birthday date) → Public page → Friendship → Feed → Notifications → Message wall

---

## Monetization

### Models That Work in This Space

**HIGH confidence (proven in adjacent markets):**

| Model | How It Works | Fit for Parabuains | Revenue Potential |
|-------|-------------|-------------------|------------------|
| **Premium profile** | Paid tier unlocks profile themes, custom backgrounds, priority placement in friend feeds, profile badges ("Celebrating 10 years!") | High — users with many friends have social incentive to stand out | Freemium; target ~5-10% conversion at ~$3-5/mo |
| **Group plans (B2B)** | Team/family subscriptions — HR managers or family organizers buy access to track birthdays for a group | High — Kudoboard, GroupGreeting, and Gifted.co all validated this; corporate market is large | Higher ARPU; less volume needed |
| **Contextual gift suggestions** | Affiliate links to gift cards or wishlists surfaced near birthday (e.g. "João turns 30 — send a gift card") | Medium — natural placement, but requires affiliate partnerships | Affiliate commission (typically 3-8%); low-friction to implement |
| **Featured/sponsored cards / virtual gifts** | Paid "premium wishes" — animated confetti, custom card templates, embedded video messages | Medium — GroupGreeting charges $4.99/card; users pay for standout moments | Per-transaction; works well for milestone birthdays |
| **Birthday reminders for businesses** | Restaurants, salons, local businesses send automated birthday offers to their customers' list | Medium-High — B2B2C; separates consumer and business personas cleanly | SaaS subscription per business seat |

**MEDIUM confidence (viable but needs validation):**

| Model | Notes |
|-------|-------|
| **Branded digital cards** | Allow brands to sponsor birthday card themes in exchange for brand visibility | Works for Hallmark-adjacent products; risk of feeling corporate in a personal context |
| **Priority notification delivery** | Free tier gets 1-day-before; premium gets 7-day-before with multiple reminders | Solves real user pain (forgetting) but may feel like holding notifications hostage |
| **Data/analytics for family accounts** | "You've sent 47 wishes this year" insights — engagement-driving upsell | Works for power users; low development cost |

### Recommended Monetization Path for v2

1. **Start with premium profile** (cosmetic differentiation — low friction to buy, high social signal)
2. **Add gift affiliate links** (zero ops cost, passive revenue, contextually relevant)
3. **Corporate/team plan** (higher ARPU, validates B2B angle before investing in full B2B product)
4. **Avoid subscriptions for core features** — notifications and friendship must remain free; premium is additive, never extractive

### Anti-Monetization (What Kills This Space)

- **Paywall on notifications** — users will churn immediately; notifications are the core value
- **Selling birthday data** — catastrophic trust violation; users share birthdays expecting privacy
- **Ads before product-market fit** — poisons the experience before retention is established

---

## MVP Feature Prioritization

### Build in v1

1. **Auth** (email/password + Google OAuth) — absolute gate
2. **Profile** (name, photo, birthday month/day, optional bio) — with year hidden by default
3. **Public page /username** — with OG meta tags for good sharing previews
4. **Privacy controls** (public / friends-only / private) — builds trust from day 1
5. **Bilateral friendship** (invite, accept, remove)
6. **Upcoming birthday feed** — "birthdays this week / next 30 days"
7. **Countdown on profile page**
8. **Message wall** (public congrats) — with basic moderation (report/hide)
9. **Private/anonymous messages** — opt-in by profile owner
10. **Email notifications** (configurable: 7d, 3d, 1d before)
11. **Web push notifications** — with clear opt-in UX

### Defer to v2

- Wish list / gift hints
- Shareable countdown badge/widget
- "Who shares my birthday" discovery
- Anonymous message analytics
- Profile themes (premium)
- Calendar / external integrations
- Group/corporate plans
- Gift affiliate links
- WhatsApp integration
- Native mobile app

---

## Sources

- BirthdayAlarm.com (feature survey) — competitor analysis
- GroupGreeting.com pricing & features — validated per-card and plan model
- Kudoboard.com/features — validated group celebration + automation features
- Gifted.co — validated B2B birthday gifting market and automation demand
- MyBirthday.Ninja — validated "fun birthday facts" engagement angle (out of scope for Parabuains but informative)
- PROJECT.md — primary requirements source, constraints, and out-of-scope decisions
- Web Push Protocol / web-push-libs — notification infrastructure patterns (HIGH confidence via Context7)
