# GymFlow Suite — Feature Guide

A complete map of **every feature**: what it does, **where to find it**, and **how it works**.
Use this to check each feature on the live site.

**Live site:** https://gymrun.tech

**Demo logins** (these are public demo accounts — change them before real use):

| Role | URL | Email | Password |
|---|---|---|---|
| Gym owner / staff | https://gymrun.tech/login | `owner@demo.gym` | `Password123!` |
| Member (portal) | https://gymrun.tech/login | `alice@member.gym` | `Password123!` |
| Platform admin (our side) | https://gymrun.tech/login | `admin@gymflow.app` | `Admin123!` |
| Public gym page (no login) | https://gymrun.tech/g/demo-gym | — | — |

Every staff page has a **title and a one-line description** at the top telling you what it does.
Navigation is the dark sidebar on the left.

---

## 1. Staff app — running the gym

### 🏠 Dashboard
- **Where:** sidebar → Dashboard (the home screen after login).
- **What:** a live snapshot of the gym — active members, revenue this month, today's check-ins, renewals due, total members.
- **How:** read at a glance. The **Quick actions** row jumps you straight to Add member / Check-in / Take payment / New class.

### 👥 Members
- **Where:** sidebar → Members.
- **What:** your full member roster and profiles.
- **How:**
  - **Add member** → a full intake popup: name, gender, date of birth, phone, email, emergency contact, assigned trainer, health notes.
  - **Edit** (pencil) / **Remove** (trash) any member.
  - **Filter** by status (active / frozen / expired / cancelled), **search** by name/phone/code, **Export CSV**.
  - **Sell plan** on a row sells a membership and records the payment in one step.
  - Click a member's **name** to open their full profile (memberships, payments, attendance, workouts, etc.).

### 🎯 Leads (sales pipeline)
- **Where:** sidebar → Leads.
- **What:** turn enquiries into members. A kanban board (New → Contacted → Trial → Negotiation → Won → Lost) with KPIs (total leads, conversion rate, follow-ups due, open pipeline value).
- **How:**
  - **Add lead** popup: name, phone, email, source (Walk-in / Website / Facebook / Instagram / Referral / Google…), estimated value, note.
  - **Click any lead card** → a detail panel where you change the stage, set a follow-up date, log calls / notes / WhatsApp / email (with a timeline), and **Convert to member** with one click.

### ⚡ Automations
- **Where:** sidebar → Automations.
- **What:** create your own message rules that run **daily on autopilot**.
- **How:**
  - **New automation** → pick a **trigger** (membership expiring / member inactive / birthday / new-member welcome), set the timing, write the **message** using variables `{firstName}` `{planName}` `{days}` `{gymName}`, choose a **channel**, switch it **on**.
  - **Toggle** any rule on/off, **edit**, or **delete** it. **Run now** fires them immediately.
  - Three starter rules come pre-loaded (renewal reminder, win-back, birthday) — all editable.
  - WhatsApp / SMS / email send **externally once you add provider keys**; until then every message is delivered **in-app** to the member and logged in "Recent messages".

### 📅 Schedule (classes)
- **Where:** sidebar → Schedule.
- **What:** your weekly class timetable.
- **How:**
  - **Add class** popup: title, day, start/end time, trainer, capacity, and **one-off or repeat for N weeks**.
  - On each class card: **book a member** (popup), **edit**, or **cancel**.
  - Navigate weeks with the arrows; **today** is highlighted; "This week" jumps back.

### ✅ Check-in
- **Where:** sidebar → Check-in.
- **What:** the front-desk "doorkeeper".
- **How:** **search a member** → see their status card (membership active/expired, plan, days left, **outstanding balance flagged in amber**, last visit) → **Check in** (it becomes "Check in anyway" if there's an issue, so staff can still let them in). **Today's** list shows who's in.
- Members can also **self-check-in** by scanning their personal QR code (see Member portal).

### 🏷️ Plans
- **Where:** sidebar → Plans.
- **What:** the membership packages you sell.
- **How:** **Add plan** / **Edit** — name, price, currency, duration (days), **class credits** (blank = unlimited), a **benefits** list, and active/archived. Editing a plan never changes what existing members already bought.

### 🔄 Renewals
- **Where:** sidebar → Renewals.
- **What:** memberships expiring soon, so nobody lapses.
- **How:** choose the window (next 7 / 14 / 30 days). For each, see the member, plan, expiry and days left. **Remind** sends a renewal nudge; the per-row **Auto-renew** toggle turns on automatic renewal; **Run auto-renewals** processes due ones now (extends them and raises an invoice).

### 💳 Payments
- **Where:** sidebar → Payments.
- **What:** record and track every payment — memberships, dues, shop sales.
- **How:** **Record a payment** (member, amount, method). An amber banner shows **outstanding dues**. The history table lets you **Collect** a pending/"due" payment, print a **Receipt**, and **Export CSV**. If Stripe is switched on, a **Pay by card (online)** button appears.

### 🛒 Shop (point of sale)
- **Where:** sidebar → Shop.
- **What:** sell supplements, drinks, and merchandise at the desk.
- **How:** **Add product** / **Edit** (name, price, stock, active). **Sell** opens a popup with quantity, payment method, and a **live total**; recording a sale **decrements stock** and updates **today's takings**. Recent sales each have a **Receipt**.

### 💸 Expenses
- **Where:** sidebar → Expenses.
- **What:** record gym running costs (rent, utilities, equipment, salaries, etc.) so you see real profit.
- **How:** **Add expense** popup (category, amount, date, note). Summary cards show **this month**, **all-time total**, and a **by-category** breakdown; the table totals at the bottom.

### 🏋️ Trainers
- **Where:** sidebar → Trainers.
- **What:** your coaching team and who they train.
- **How:** **Add trainer** / **Edit** (name, specialisation, email, phone, hourly rate, bio, active) / archive. Click a trainer to expand their **assigned members**. (Assign a member to a trainer from the member's intake/edit popup.)

### 📊 Reports
- **Where:** sidebar → Reports.
- **What:** the numbers behind the business — revenue, memberships, attendance trends.
- **How:** read the charts and tables; export where available. *(Being expanded with richer visuals and seeded demo data so it's never empty.)*

### ⚙️ Settings
- **Where:** sidebar → Settings.
- **What:** your gym profile (name, address, city, currency, timezone, logo) and staff/role management.
- **How:** edit gym details; invite staff and assign roles/permissions.
- **🛟 Support access:** at the bottom of Settings. Stuck on something? Generate a secure code that lets GymFlow support open your account and fix it. **You** choose how much access (**Full** = can make changes, or **Limited** = view & diagnose, no billing/staff/settings/deletions) and how long (**1 hour – 7 days**). The code is shown **once** — share it with support. Access **auto-expires** when the timer runs out, you can **revoke** it anytime, and every grant is **audit-logged**.

---

## 2. Member portal — what your members get

- **Login:** a member account (e.g. `alice@member.gym`) → the member portal.
- **Features:** membership status & expiry, a personal **QR check-in code**, **book classes**, view assigned **workouts** and **diet plans**, track **progress**, see **loyalty points** and a **referral code**, **pay online** (if Stripe is on), **notifications/reminders**, and **e-sign waivers**.
- **Installable app:** the portal is a **PWA** — on a phone, "Add to Home Screen" installs it like a native app.

---

## 3. Public gym page — for prospects (no login)

- **URL:** `https://gymrun.tech/g/demo-gym` (each gym gets its own `/g/<slug>`).
- **Features:** your gym name & location, **membership plans**, **upcoming classes**, and a **"Join" form** that drops the prospect straight into your Leads pipeline.
- **AI receptionist chat** (config-gated — see below): a chat bubble that answers prospects' questions and captures them as leads automatically.

---

## 4. AI Receptionist (config-gated)

- **Where:** the chat bubble on the public gym page.
- **What:** a Claude-powered assistant that answers questions about plans/classes and **captures interested visitors into the Leads pipeline automatically**.
- **Switch on:** add an Anthropic API key (`ANTHROPIC_API_KEY`) — see `DEPLOYMENT.md §5b`. Until then it stays hidden (dormant).

---

## 5. Platform console — "our side" (super admin)

- **Login:** `admin@gymflow.app` → the platform console.
- **What:** the SaaS operator view — see and manage all gyms (tenants) on the platform, their subscriptions and status.
- **🛟 Support access:** when a gym shares a support code, paste it under **Support access → Open session** to drop into a **scoped, auto-expiring** session inside that gym (an amber banner shows the gym, access level, and a live countdown the whole time; **Exit support** returns you here). Live support windows from every gym are listed below the box. Only the platform admin can redeem, redemptions are **audit-logged**, and a single session token lasts at most 2 hours (re-open to extend within the gym's window).

---

## ✨ Hidden / easy-to-miss features

Things that are built and live but easy to overlook:

- **QR self-check-in** — members scan their own QR (from the portal) to check in; staff don't have to do anything.
- **Loyalty points + referrals** — points are auto-awarded on check-in, and members get a referral code that rewards them when a friend joins.
- **Auto-renew billing** — turn on per membership; it extends and invoices automatically (Renewals page).
- **Convert lead → member** — one click on a lead turns it into a full member, carrying the details over.
- **Contracts / waivers** — members e-sign; acceptances are stored.
- **Printable receipts** — on every payment and shop sale.
- **CSV export** — members and payments.
- **Installable mobile app (PWA)** — the member portal installs to a phone home screen.
- **Member profile deep-dive** — click any member's name for their full history.
- **AI captures leads for you** — the receptionist files prospects into the pipeline without staff lifting a finger.
- **Multi-gym / multi-branch foundation** — the data model is multi-tenant, ready for chains.

---

## 🔌 Config-gated integrations (add keys to switch on — your side)

These are **built and dormant** until you add keys, then they "light up" automatically (no code change):

| Integration | Unlocks | Key | Doc |
|---|---|---|---|
| **Stripe** | Online card payments + auto-charge on renewal | `STRIPE_SECRET_KEY` | `DEPLOYMENT.md §5` |
| **Anthropic (Claude)** | AI receptionist on the public page | `ANTHROPIC_API_KEY` | `DEPLOYMENT.md §5b` |
| **WhatsApp / SMS / Email** | External delivery for automations & reminders | `WHATSAPP_API_TOKEN` / `TWILIO_*` / `RESEND_API_KEY` | `.env.example` |

We never enter real keys for you — that's your step. Everything works in-app/cash without them.

---

_Last updated: 2026-06-16. The product is being deepened feature-by-feature to industry standard;
this guide is kept in sync as each feature lands._
