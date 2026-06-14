# GymFlow Suite — Product Expansion & Research Plan

> **Status:** v2 scope (Planning) · 2026-06-14
> **Purpose:** Plan the *full* product — every surface and the feature breadth a real,
> marketable gym platform needs. Extends [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) (which
> covered the MVP). Build order is now **complete the WEB product across all surfaces
> first**, then desktop, then mobile.

---

## 1. Where we are vs. where we're going

**Built so far (the foundation — correct, but intentionally minimal):** a multi-tenant
backend (auth, RBAC, members, plans, memberships, payments, attendance, dashboard,
reports, staff, settings, trainers) and one **gym-admin web app**. It proves the
architecture and the core loop. It is **not yet** the product people pay for.

**The gap (honest):** today's screens are an MVP skeleton. Competitors (Mindbody,
Glofox, PushPress, Wellyx, WellnessLiving, Virtuagym, etc.) win on **depth** —
scheduling/calendars, online class booking, recurring billing, a branded member app,
CRM/lead automation, marketing, retention tooling, and access control. To be
*marketable*, GymFlow needs that depth across four distinct surfaces.

---

## 2. The big picture: four surfaces (this answers "whose dashboard is this?")

The product is **not one dashboard** — it is four connected experiences on one backend:

```
                         ┌─────────────────────────────────────────┐
                         │     ONE BACKEND (NestJS + Postgres)      │
                         └─────────────────────────────────────────┘
        ┌────────────────────┬───────────────┴──────────┬────────────────────┐
        │                    │                          │                    │
 A. PLATFORM CONSOLE   B. GYM ADMIN            C. MEMBER PORTAL      D. PUBLIC / MARKETING
   ("our side" —        (the gym's staff:        & APP                 - GymFlow website
    Sparking Asia)       owner/manager/          (web + mobile;          (sell to gyms)
   - manage all gyms     reception/trainer)       what a member         - per-gym public page
   - SaaS subscriptions  - the rich operational    sees)                  (online join, public
   - cross-gym revenue    app (calendar, classes,  - book classes,         schedule, book a
   - support/impersonate  CRM, billing, POS,        pay/renew, workouts,   trial, buy online)
   - white-label config   marketing, access,        progress, check-in   - branded member app
   - franchise/branches   reports, payroll …)       via QR
```

- **A. Platform Console ("our side")** — *what you asked for:* where **you/Sparking Asia**
  manage every gym tenant, their subscriptions and billing (your revenue), see total
  MRR/churn across all gyms, provide support (log in as a gym), configure white-label, and
  run multi-branch/franchise oversight. **Not built yet.**
- **B. Gym Admin** — the gym's own command center (today's dashboard). This is where the
  team works: calendars, trainer schedules, classes, payments, marketing. **Partially
  built; to be greatly expanded.**
- **C. Member Portal & App** — the member's *personal* view (status, bookings, workouts,
  payments). The dashboard you saw is **B, not C.** **Not built yet.**
- **D. Public / Marketing** — the GymFlow marketing site (to sell the SaaS) **and** each
  gym's public page/booking widget (so a prospect can join online). **Not built yet.**

---

## 3. Competitive landscape (research, June 2026)

| Platform | Positioning | Notable strengths | Rough price |
|---|---|---|---|
| **PushPress** | Best overall for most gyms; CrossFit/functional | Free tier, built by gym owners, clean | $0 → ~$159/mo |
| **Mindbody** | Large/multi-location wellness | API-rich, door integrations, marketplace | up to $599+/mo |
| **Glofox** | Boutique studios | **Branded member app on every plan**, polished | ~$75–200/mo |
| **Gymdesk** | Solid fundamentals, fair price | Simple, good value (weak on marketing/branded app) | low–mid |
| **Wellyx / WellnessLiving / Virtuagym** | All-in-one | CRM, automation, retention, member app | mid |
| **GymMaster / ClubReady** | Access-control & POS focus | 24/7 door access, retail POS, kiosks | mid |

**What "advanced" means in this market:** online class **booking + waitlists**, **recurring
billing** with failed-payment recovery, a **branded member mobile app**, **CRM + lead
automation** (capture from Instagram/Facebook/walk-ins, nurture via SMS/email/WhatsApp),
**retention tooling** (spot "at-risk" members, win-back), **access control** (QR/kiosk/door),
**POS/retail**, and **roll-up reporting** for multi-location. That is the bar GymFlow is
built to clear.

---

## 4. The complete feature catalog

Tagged by **surface** (A=Platform, B=Gym admin, C=Member, D=Public) and **tier**
(T1 = needed to be genuinely usable & sellable · T2 = makes it loved/competitive ·
T3 = scale/platform). This is intentionally broad — pick and sequence from it.

### 4.1 Members & CRM
| Feature | Surface | Tier |
|---|---|---|
| Rich member profiles (docs, photos, emergency, health, tags, custom fields) | B | T1 |
| Membership lifecycle: join, **freeze/hold**, upgrade/downgrade, transfer, cancel, reactivate | B,C | T1 |
| **Digital contracts & e-signature**, liability waivers (versioned) | B,C,D | T1 |
| Family / household / linked accounts | B,C | T2 |
| **Lead capture** (web forms, social lead ads, walk-in, QR) | B,D | T1 |
| **Sales pipeline / leads Kanban**, trials, follow-up automation | B | T1 |
| At-risk / churn detection + win-back journeys | B | T2 |
| Member segments & tags; communication timeline (omnichannel) | B | T2 |

### 4.2 Scheduling, Classes & Appointments
| Feature | Surface | Tier |
|---|---|---|
| **Class schedule + calendar** (day/week/month, recurring, templates) | B,C,D | T1 |
| **Online class booking**, capacity, **waitlists** (auto-promote) | B,C | T1 |
| Drop-ins & **class packs / credits** | B,C | T1 |
| **Appointments & PT session booking** | B,C | T1 |
| Facility/resource booking (courts, rooms, equipment) | B,C | T2 |
| **Staff rosters / shift scheduling**, substitutes/cover | B | T2 |
| Cancellation policy, late-cancel / no-show fees | B,C | T2 |
| Calendar sync (Google/iCal), automated reminders | B,C | T2 |

### 4.3 Billing, Payments & POS
| Feature | Surface | Tier |
|---|---|---|
| **Recurring billing / subscriptions** (auto-charge) | B,C | T1 |
| Online payments — **Stripe + local gateways** (Razorpay, JazzCash/Easypaisa, Paystack…) | B,C,D | T1 |
| **Failed-payment recovery / dunning / retries** | B | T1 |
| Branded **invoices & receipts** (PDF), tax/VAT | B,C | T1 |
| **POS / retail** (supplements, merch) + **inventory** | B | T2 |
| Discounts, coupons, promo codes; gift cards / account wallet | B,C,D | T2 |
| Payment plans / installments; outstanding-dues management | B,C | T2 |
| Payouts & financial reconciliation; multi-currency | A,B | T2 |

### 4.4 Access Control & Check-in
| Feature | Surface | Tier |
|---|---|---|
| **QR / barcode check-in**; self-service **kiosk** (tablet) | B,C | T1 |
| **Door access control** (24/7 unstaffed), RFID/fobs/biometric | B | T2 |
| Live occupancy / capacity headcount | B,C | T2 |
| Guest/day passes; check-in validation (status & dues) | B,C | T1 |

### 4.5 Member Engagement & Retention
| Feature | Surface | Tier |
|---|---|---|
| **Push / SMS / email / WhatsApp** notifications | B,C | T1 |
| In-app messaging (member ↔ trainer, broadcasts) | B,C | T2 |
| **Loyalty points & rewards**, referral program | B,C | T2 |
| Challenges, leaderboards, badges, streaks | B,C | T2 |
| Reviews/reputation prompts; surveys / NPS | B,C | T2 |
| Birthday/anniversary & re-engagement automations | B | T2 |

### 4.6 Training & Wellness
| Feature | Surface | Tier |
|---|---|---|
| **Workout program builder** + exercise library (video) | B,C | T1 |
| Assign programs, track completion | B,C | T1 |
| **Nutrition / diet plans**, macros, meal plans | B,C | T2 |
| **Progress** (weight, measurements, body-fat, photos), PR/benchmark tracking | B,C | T1 |
| Assessments, goals, habit tracking | B,C | T2 |
| Wearable / health-app sync (Apple Health, Google Fit); on-demand & live content | C | T3 |

### 4.7 Marketing & Growth
| Feature | Surface | Tier |
|---|---|---|
| **Email & SMS campaign builder + automations (drip)** | B | T1 |
| Audience segmentation | B | T2 |
| **Public booking widget / per-gym sign-up funnel** | B,D | T1 |
| Promotions, seasonal campaigns, lead-ad integrations | B,D | T2 |
| Affiliate/partner tracking; reputation management | B | T3 |

### 4.8 Staff & Operations
| Feature | Surface | Tier |
|---|---|---|
| Granular **roles & permissions** (have basics) | A,B | T1 |
| Staff scheduling, **time clock**, attendance | B | T2 |
| **Payroll & commissions** (class/session/trainer pay) | B | T2 |
| Tasks/to-dos, internal notes/handover, document management | B | T2 |
| Audit logs (have basics) | A,B | T1 |

### 4.9 Reporting & Analytics
| Feature | Surface | Tier |
|---|---|---|
| Revenue, **MRR / ARPU / LTV**, churn & **retention/cohort** | A,B | T1 |
| Attendance & utilization (peak hours, class fill rate) | B | T1 |
| Lead conversion funnel; trainer/staff performance | B | T2 |
| **At-risk member** report; custom report builder + scheduled exports | B | T2 |
| Forecasting; KPI goals | A,B | T3 |

### 4.10 Platform / SaaS — "our side" (A)
| Feature | Surface | Tier |
|---|---|---|
| **Tenant (gym) management & onboarding** | A | T1 |
| **SaaS subscription plans & billing for gyms** (your revenue) + feature gating per tier | A | T1 |
| Cross-gym **MRR / churn / growth** analytics | A | T2 |
| **Support tools / impersonation** ("log in as gym") | A | T2 |
| **White-label** per gym (branding, custom domain, custom app) | A | T2 |
| **Multi-branch / franchise:** consolidated reporting, branch switching, HQ oversight, royalties | A | T3 |
| Feature flags, platform announcements/changelog, status page, backups | A | T3 |

### 4.11 Public surfaces & client apps (C, D)
| Feature | Surface | Tier |
|---|---|---|
| **Member web portal** (status, bookings, payments, workouts, progress) | C | T1 |
| **Member + trainer mobile apps** (iOS/Android), branded | C | T2 |
| **GymFlow marketing website** (sell the SaaS) + pricing/signup | D | T1 |
| **Per-gym public page** (schedule, join online, buy, book trial) | D | T1 |

### 4.12 Integrations & AI
| Feature | Surface | Tier |
|---|---|---|
| **Open REST API + webhooks** (have OpenAPI) | A,B | T2 |
| Zapier/Make; accounting (QuickBooks/Xero); WhatsApp Business; Zoom (virtual classes) | B | T3 |
| **AI:** lead scoring & churn prediction, auto workout/diet generation, smart scheduling, support chatbot | A,B,C | T3 |

> **Total: ~80 features** across the catalog — far beyond a "simple" app, and deliberately
> at or above the competitor bar.

---

## 5. Prioritized roadmap (web-first across all surfaces)

Per your direction: build the **complete web product** (all four surfaces) first, so every
feature exists on the web — then the desktop and mobile apps reuse it.

### Phase A — "Sellable core" (Tier 1) — *make a real gym able to fully run on it*
Scheduling + calendar · online class booking & waitlists · recurring billing + **online
card payments** (Stripe + one local gateway) · invoices/receipts · **digital contracts &
waivers** · CRM/leads + follow-ups · email/SMS notifications · **member web portal** ·
**per-gym public booking/join page** · richer reporting (MRR, retention, utilization) ·
QR/kiosk check-in. **Outcome:** a gym can sign up, put their schedule online, take payments,
and members can self-serve — i.e., a product you can demo and sell.

### Phase B — "Loved & competitive" (Tier 2) — *retention, engagement, mobile*
**Member + trainer mobile apps** · marketing automations & segments · loyalty/referrals ·
at-risk/win-back · training/nutrition/progress depth · POS/retail + inventory ·
payroll/commissions · door access control · in-app messaging.

### Phase C — "Scale & your business" (Tier 3) — *the platform side & growth*
**Platform Console** (manage all gyms + SaaS billing — *your revenue engine*) · white-label ·
multi-branch/franchise & roll-up reporting · public API + integrations · AI features ·
advanced/forecasting analytics.

### Then: Desktop (Tauri/Electron) & deeper mobile
Wrap the proven web reception flows for the front desk (native printing, offline,
scanners); expand mobile beyond the member/trainer MVP.

---

## 6. What our current foundation already supports

Good news — much of the above is **additive**, not a rewrite, because the base was built for it:
- **Multi-tenant from day one** (`gym_id` on every table) → the Platform Console and
  multi-branch sit naturally on top.
- **RBAC** (roles + permission keys, server-enforced) → new staff/manager/trainer powers are
  just new permissions.
- **Modular backend** (one NestJS module per domain) → each new area (classes, billing,
  CRM, marketing) is a new module that doesn't disturb the others.
- **Shared contracts** (`@gymflow/shared` zod schemas) and **OpenAPI** → the member portal,
  public site, and mobile apps reuse the same validated API.
- Schema already has `classes`, `bookings`, `notifications`, `audit_logs`, `parent_gym_id`
  (branches), `subscription_plan/status` on gyms — stubs we can now flesh out.

---

## 7. New infrastructure & decisions needed (for later — not blocking)

- **Payments:** Stripe (subscriptions + webhooks) + a local gateway adapter (region-specific).
- **Messaging:** email (Resend/Postmark), SMS (Twilio/local), **WhatsApp Business**, push (FCM).
- **Background jobs:** BullMQ (Redis) for reminders, dunning, campaigns, report generation.
- **File storage:** S3/R2 for documents, contracts, progress photos, exercise videos.
- **Web auth hardening:** move to httpOnly cookies before public launch.
- **Online hosting (the "online move"):** managed Postgres/Redis, then deploy.
- **Class booking model:** finalize capacity/waitlist/credit rules.
- **White-label/custom domains:** for branded member experiences.

---

## 8. Recommendation & immediate next steps

1. **Adopt this as the scope.** It defines the full product across all four surfaces and a
   tiered path to get there. (Cost/time is large — this is a real Mindbody/Glofox-class
   platform — but it's sequenced so value lands early.)
2. **Start Phase A on the web**, in this order (each is demoable):
   1. **Scheduling + classes + online booking** (the single biggest "this is a real product"
      jump), 2. **online payments + recurring billing**, 3. **member web portal**,
   4. **CRM/leads + communications**, 5. **per-gym public booking page**, 6. the **Platform
   Console** skeleton (your side).
3. **Land one real gym early** (per `PRODUCT_PLAN.md` §17) once Phase A is usable — real
   feedback decides what in Tier 2/3 to build next.

> Treat §4 as the menu and §5 as the order of cooking. We can re-prioritize any item up or
> down based on what your target gyms ask for.

---

## Sources (market research, June 2026)
- [Gymdesk — Best Gym Management Software 2026](https://gymdesk.com/blog/best-gym-management-software)
- [PushPress — Mindbody alternatives 2026](https://www.pushpress.com/blog/7-best-mindbody-alternatives-for-gym-owners-in-2026)
- [PushPress — Best member apps 2026](https://www.pushpress.com/blog/10-best-member-apps-for-gyms-and-fitness-studios-in-2026)
- [Glofox — Gym management software features](https://www.glofox.com/blog/gym-management-software-features/)
- [Wellyx — Gym management software comparison 2026](https://wellyx.com/blog/gym-management-software-comparison/)
- [Kisi — 19 best gym management software 2026](https://www.getkisi.com/blog/best-gym-management-systems-compared)
- [SoftwareWorld — Best gym CRM software](https://www.softwareworld.co/best-gym-crm-software/)
- [Exercise.com — Multi-location gym software](https://www.exercise.com/platform/multi-location/) · [Gym POS software](https://www.exercise.com/platform/pos/)
- [Virtuagym — Gym access control](https://business.virtuagym.com/gym-access-control-system/)
