'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const FEATURES = [
  { icon: '👥', title: 'Members & CRM', body: 'Profiles, memberships, leads and follow-ups — never let a renewal slip.' },
  { icon: '📅', title: 'Classes & booking', body: 'Schedule classes, take online bookings with waitlists and capacity.' },
  { icon: '💳', title: 'Payments & billing', body: 'Recurring billing, invoices and POS — money collected on autopilot.' },
  { icon: '📱', title: 'Member app', body: 'Your members book, pay and track progress from their phone.' },
  { icon: '📊', title: 'Owner dashboard', body: 'Revenue, retention and attendance — your whole gym at a glance.' },
  { icon: '✅', title: 'Fast check-in', body: 'QR / kiosk check-in with instant active/expired status at the desk.' },
];

const PRICING = [
  { name: 'Starter', price: '$29', tag: 'New & small gyms', features: ['Up to 150 members', '3 staff seats', 'Web + member app', 'Payments & attendance'] },
  { name: 'Professional', price: '$79', tag: 'Established gyms', highlight: true, features: ['Up to 750 members', '15 staff seats', 'Class booking & reminders', 'Advanced reports + export'] },
  { name: 'Enterprise', price: 'Custom', tag: 'Chains & franchises', features: ['Unlimited members', 'Multi-branch', 'White-label apps', 'Dedicated support + SLA'] },
];

export default function LandingPage() {
  const { user, isMemberOnly, isPlatformAdmin } = useAuth();
  const dest = !user ? '/login' : isPlatformAdmin ? '/platform' : isMemberOnly ? '/portal' : '/dashboard';
  const cta = user ? 'Go to app' : 'Sign in';

  return (
    <div className="bg-white text-slate-900">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-xl font-bold text-brand">GymFlow<span className="text-slate-500"> Suite</span></div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#features" className="hidden text-slate-600 hover:text-slate-900 sm:block">Features</a>
          <a href="#pricing" className="hidden text-slate-600 hover:text-slate-900 sm:block">Pricing</a>
          <Link href={dest} className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
            {cta}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-brand">
            The all-in-one platform for modern gyms
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Run your gym on autopilot — from front desk to phone.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Memberships, class booking, payments, a branded member app, and owner dashboards —
            everything you need to grow your gym and keep members coming back.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={dest} className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
              Get started
            </Link>
            <a href="#features" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              See features
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">14-day free trial · no card required</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Everything a gym needs, in one place</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Replace the patchwork of spreadsheets, paper registers and chat threads with one connected system.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 p-6 transition hover:shadow-md">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">Simple pricing that grows with you</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border bg-white p-8 ${p.highlight ? 'border-brand ring-2 ring-brand' : 'border-slate-200'}`}
              >
                {p.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 text-4xl font-extrabold">
                  {p.price}
                  {p.price !== 'Custom' && <span className="text-base font-medium text-slate-500">/mo</span>}
                </div>
                <p className="mt-1 text-sm text-slate-500">{p.tag}</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <span className="text-brand">✓</span> {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={dest}
                  className={`mt-8 block rounded-lg px-4 py-2.5 text-center font-medium ${p.highlight ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to grow your gym?</h2>
        <p className="mx-auto mt-3 max-w-xl px-6 text-indigo-100">
          Join gyms running their entire operation on GymFlow Suite.
        </p>
        <Link href={dest} className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand hover:bg-indigo-50">
          {user ? 'Open your dashboard' : 'Start your free trial'}
        </Link>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} GymFlow Suite — by Sparking Asia.
      </footer>
    </div>
  );
}
