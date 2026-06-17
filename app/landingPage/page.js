"use client";

import Link from "next/link";
import { Nfc, Fingerprint, MapPin, ArrowRight, UserCheck, Clock, Award, TrendingUp, Shield, Cloud, BarChart2, CheckCircle, XCircle } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import { useEffect, useRef, useState } from "react";

const benefits = [
  {
    title: "RFID Attendance Tracking",
    description: "Fast, contactless participant check-in and check-out using RFID technology.",
    icon: "◉",
  },
  {
    title: "Facial Recognition Verification",
    description: "Prevents proxy attendance with real-time biometric identity confirmation.",
    icon: "◈",
  },
  {
    title: "Geofencing Security",
    description: "Ensures participants are physically present within the designated event location.",
    icon: "⌖",
  },
  {
    title: "Automated Certificate Generation",
    description: "Qualified participants receive digital certificates automatically, with no manual checking required.",
    icon: "✦",
  },
  {
    title: "Real-Time Dashboard & Analytics",
    description: "Track attendance, engagement, and event performance instantly.",
    icon: "▣",
  },
  {
    title: "Cloud-Based Data Management",
    description: "Securely store participant records, event logs, and attendance reports in real time.",
    icon: "☁",
  },
];

const techHighlights = [
  "RFID Authentication",
  "InsightFace AI Recognition",
  "Google Secure Authentication",
  "Supabase Cloud Database",
  "Real-Time Analytics Dashboard",
];

const stats = [
  { label: "Attendance Verification Accuracy" },
  { label: "Check-in Processing" },
  { label: "Automated Certificate Delivery" },
];

const beforeAfter = [
  {
    title: "Before EventFlow",
    items: [
      "Disorganized registration lines",
      "Paper attendance sheets",
      "Delayed certificate distribution",
    ],
    accent: "from-slate-100 to-slate-200",
    border: "border-slate-200",
    icon: XCircle,
    iconColor: "text-slate-400",
  },
  {
    title: "After EventFlow",
    items: [
      "Fast RFID check-in",
      "Instant face verification",
      "Live attendance dashboard",
      "Automated certificate release",
    ],
    accent: "from-emerald-50 to-emerald-100",
    border: "border-emerald-200",
    icon: CheckCircle,
    iconColor: "text-emerald-500",
  },
];

const securityFeatures = [
  {
    icon: Nfc,
    bg: "bg-emerald-400/15",
    text: "text-emerald-300",
    hoverBg: "hover:bg-emerald-400/25",
    ping: "bg-emerald-400",
    label: "Tap to check in",
    title: "Contactless entry enabled",
  },
  {
    icon: Fingerprint,
    bg: "bg-amber-400/15",
    text: "text-amber-300",
    hoverBg: "hover:bg-amber-400/25",
    ping: "bg-amber-400",
    label: "Biometric verification",
    title: "Proxy attendance blocked",
  },
  {
    icon: MapPin,
    bg: "bg-sky-400/15",
    text: "text-sky-300",
    hoverBg: "hover:bg-sky-400/25",
    ping: "bg-sky-400",
    label: "Geofencing active",
    title: "Location validated in real time",
  },
];

const uptimeBars = [38, 52, 46, 64, 58, 72, 66, 80, 74, 90, 84, 96];

// Stat card data with icons
const statCards = [
  {
    label: "Check-ins",
    value: "1,964",
    numericValue: 1964,
    icon: UserCheck,
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    label: "Pending Review",
    value: "21",
    numericValue: 21,
    icon: Clock,
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    label: "Certificates Released",
    value: "1,880",
    numericValue: 1880,
    icon: Award,
    color: "text-sky-300",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
  },
];

// Animated counter hook
function useCountUp(target, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// Scroll-reveal hook
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// Animated stat card component
function AnimatedStatCard({ card, index, started }) {
  const count = useCountUp(card.numericValue, 1400 + index * 100, started);
  const Icon = card.icon;
  const display = card.numericValue > 100
    ? count.toLocaleString()
    : count.toString();

  return (
    <div
      className={`
        rounded-2xl border ${card.border} ${card.bg} px-4 py-3
        opacity-0 animate-fade-up
        hover:scale-[1.03] hover:brightness-110
        transition-all duration-300 cursor-default
        group relative overflow-hidden
      `}
      style={{ animationDelay: `${120 + index * 100}ms` }}
    >
      {/* Shimmer on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

      <div className="flex items-center gap-2 mb-2">
        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${card.bg} ${card.color}`}>
          <Icon size={14} strokeWidth={2} />
        </div>
        <p className={`text-xs uppercase tracking-[0.2em] ${card.color} font-semibold`}>{card.label}</p>
      </div>
      <p className={`text-2xl font-bold text-white tabular-nums`}>{display}</p>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 backdrop-blur">
      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)] animate-pulse" />
      {children}
    </span>
  );
}

// Enhanced animated buttons
function Button({ children, href, variant = "primary" }) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold overflow-hidden group transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-95";

  if (variant === "primary") {
    return (
      <Link
        className={`${base} bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.45)] hover:scale-[1.04]`}
        href={href}
      >
        {/* Shimmer sweep */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <span className="relative z-10 flex items-center gap-2">
          {children}
          <ArrowRight
            size={15}
            className="translate-x-0 group-hover:translate-x-1 transition-transform duration-200"
          />
        </span>
      </Link>
    );
  }

  return (
    <Link
      className={`${base} border border-white/15 bg-white/8 text-white backdrop-blur hover:border-emerald-300/60 hover:bg-white/14 hover:scale-[1.04] hover:shadow-[0_0_28px_rgba(52,211,153,0.15)]`}
      href={href}
    >
      {/* Subtle glow pulse ring */}
      <span className="absolute inset-0 rounded-full border border-emerald-400/0 group-hover:border-emerald-400/30 transition-all duration-500 scale-100 group-hover:scale-105 pointer-events-none" />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(4,10,23,0.32)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

// Scroll-reveal wrapper
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  // Trigger counters when stat cards become visible
  const [statsRef, statsInView] = useInView(0.3);

  return (
    <>
      <SiteHeader />
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes grow-width {
          from { width: 0; }
          to { width: 98.7%; }
        }
        @keyframes bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @keyframes border-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 0 4px rgba(52,211,153,0.15); }
        }
        .animate-fade-up {
          animation: fade-up 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .animate-grow-width {
          animation: grow-width 1.2s cubic-bezier(0.22,1,0.36,1) 0.3s forwards;
          width: 0;
        }
        .animate-bar-grow {
          animation: bar-grow 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .animate-border-pulse {
          animation: border-pulse 2.5s ease-in-out infinite;
        }
      `}</style>

      <main className="themed-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(202,138,4,0.16),transparent_24%),linear-gradient(180deg,var(--hero-top)_0%,var(--hero-mid)_34%,var(--page-bg-soft)_34%,var(--page-bg)_100%)] text-[var(--foreground)]">

        {/* ── HERO ── */}
        <section className="relative isolate border-b border-white/10 text-white">
          <div className="absolute inset-0 -z-10 bg-(--hero-overlay)" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[64px_64px] opacity-40" />

          <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-20 pt-8 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-14">

            {/* LEFT COPY */}
            <div className="max-w-2xl">
              <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0ms" }}>
                <SectionLabel>EventFlow™ Smart Attendance Management</SectionLabel>
              </div>

              <h1
                className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl opacity-0 animate-fade-up"
                style={{ animationDelay: "80ms" }}
              >
                Smarter Attendance. Stronger Security. Seamless Events.
              </h1>

              <p
                className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl opacity-0 animate-fade-up"
                style={{ animationDelay: "160ms" }}
              >
                Transform how your institution manages events with RFID authentication, facial recognition, geofencing,
                and automated certificate generation all in one powerful platform.
              </p>

              {/* ── ANIMATED BUTTONS ── */}
              <div
                className="mt-10 flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-up"
                style={{ animationDelay: "240ms" }}
              >
                <Button href="/login">Sign In</Button>
                <Button href="/register" variant="secondary">Sign Up</Button>
              </div>

              {/* Mini feature pills */}
              <div
                className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3 opacity-0 animate-fade-up"
                style={{ animationDelay: "320ms" }}
              >
                {[
                  ["Secure check-in", "RFID + face verification"],
                  ["Live control", "Attendance and location tracking"],
                  ["Instant output", "Certificates generated automatically"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur hover:border-emerald-400/30 hover:bg-white/10 transition-all duration-300"
                  >
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT DASHBOARD CARD */}
            <div className="relative opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
              <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="absolute -right-2 bottom-4 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />

              <div className="relative rounded-4xl border border-white/10 bg-white/7 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
                  <span>EventFlow Control Center</span>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Live
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  {/* Left stat card */}
                  <Card className="bg-(--hero-card) p-4 group opacity-0 animate-fade-up hover:border-emerald-400/30 transition-all duration-300" style={{ animationDelay: "200ms" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Attendance overview</p>
                        <p className="mt-1 text-2xl font-semibold text-white transition-all duration-300 group-hover:text-emerald-300">
                          2,418 verified
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-400/15 px-3 py-2 text-right transition-all duration-300 group-hover:bg-emerald-400/25 group-hover:scale-105">
                        <p className="text-xs text-emerald-200">Verification rate</p>
                        <p className="text-lg font-semibold text-white">98.7%</p>
                      </div>
                    </div>

                    <div className="mt-4 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-grow-width" />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>0</span>
                      <span>3,000 capacity</span>
                    </div>

                    {/* ── ENHANCED STAT CARDS WITH ICONS + COUNTERS ── */}
                    <div ref={statsRef} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      {statCards.map((card, i) => (
                        <AnimatedStatCard key={card.label} card={card} index={i} started={statsInView} />
                      ))}
                    </div>
                  </Card>

                  {/* Right security cards */}
                  <div className="flex flex-col gap-3">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Security &amp; network status
                    </p>
                    <div className="grid gap-4">
                      {securityFeatures.map(({ icon: Icon, bg, text, hoverBg, ping, label, title }, i) => (
                        <Card
                          key={label}
                          className="bg-(--hero-card) p-4 group cursor-default opacity-0 animate-fade-up hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200"
                          style={{ animationDelay: `${i * 120}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${bg} ${hoverBg} transition-all duration-200 group-hover:scale-110 ${text}`}>
                              <Icon size={20} strokeWidth={1.75} />
                              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ping} opacity-60`} />
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ping}`} />
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-300">{label}</p>
                              <p className="font-semibold text-white group-hover:text-emerald-100 transition-colors duration-200">{title}</p>
                            </div>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400 text-xs">↗</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* System uptime */}
                <Card className="bg-(--hero-card) mt-4 p-4 opacity-0 animate-fade-up" style={{ animationDelay: "420ms" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">System uptime</p>
                  <div className="mt-4 flex h-12 items-end gap-1.5">
                    {uptimeBars.map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 origin-bottom scale-y-0 animate-bar-grow rounded-sm bg-emerald-400 hover:bg-emerald-300 transition-colors duration-150 cursor-default"
                        style={{
                          height: `${height}%`,
                          opacity: 0.35 + (i / uptimeBars.length) * 0.65,
                          animationDelay: `${500 + i * 40}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    Stable connectivity detected · Last sync 2s ago
                  </div>
                </Card>
              </div>
            </div>

          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section id="problem" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <Reveal>
              <SectionLabel>Problem</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Still Using Manual Attendance Sheets?
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Paper logbooks, manual checklists, and spreadsheet-based attendance create delays, errors, proxy
                attendance, and extra administrative work. When events grow larger, managing participants becomes harder,
                and certificate validation becomes time-consuming and inconsistent.
              </p>
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-700 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Solution</p>
                <p className="mt-3 text-base leading-7">
                  EventFlow™ eliminates manual processes by automating attendance verification, location validation, and
                  certificate generation, saving time while improving security and accuracy.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
                <div className="grid gap-0 md:grid-cols-2">
                  {beforeAfter.map((column) => {
                    const ColIcon = column.icon;
                    return (
                      <div key={column.title} className={`bg-linear-to-br ${column.accent} border-b ${column.border} p-6 md:border-b-0 md:border-r`}>
                        <div className="flex items-center gap-2">
                          <ColIcon size={14} className={column.iconColor} />
                          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{column.title}</p>
                        </div>
                        <div className="mt-6 space-y-3">
                          {column.items.map((item, idx) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              style={{ transitionDelay: `${idx * 40}ms` }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
                  From manual chaos to intelligent automation, EventFlow transforms your event experience.
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* ── BENEFITS ── */}
        <section id="benefits" className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
            <Reveal>
              <div className="max-w-2xl">
                <SectionLabel>Benefits</SectionLabel>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Designed for institutions, organizations, and event coordinators who need accuracy at scale.
                </h2>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {benefits.map((benefit, i) => (
                <Reveal key={benefit.title} delay={i * 60}>
                  <Card className="border-white/10 bg-white/6 hover:border-emerald-400/25 hover:bg-white/9 hover:-translate-y-1 transition-all duration-300 group h-full">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-amber-400/15 text-xl text-emerald-300 group-hover:scale-110 transition-transform duration-300">
                        {benefit.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{benefit.description}</p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── TECHNOLOGY ── */}
        <section id="demo" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <Reveal>
              <SectionLabel>Technology</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Built with Advanced Event Intelligence
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EventFlow™ combines RFID authentication, InsightFace biometric recognition, geofencing validation,
                rule-based decision algorithms, and cloud database technology to deliver secure, accurate, and scalable
                attendance management for institutions and organizations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {techHighlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-emerald-300 hover:shadow-emerald-100 hover:shadow-md transition-all duration-200 cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <Card className="border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["RFID Authentication", "Secure badge-based access", Nfc],
                    ["InsightFace AI Recognition", "Real-time identity confirmation", Fingerprint],
                    ["Google Secure Authentication", "Protected institutional login", Shield],
                    ["Supabase Cloud Database", "Reliable data synchronization", Cloud],
                    ["Real-Time Analytics Dashboard", "Instant operational visibility", BarChart2],
                  ].map(([title, text, Icon]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-200 hover:bg-emerald-50/40 hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-emerald-600 group-hover:scale-110 transition-transform duration-200" />
                        <p className="font-semibold text-slate-950">{title}</p>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section className="bg-linear-to-br from-emerald-950 via-slate-950 to-slate-900 text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
            <Reveal>
              <div className="max-w-2xl">
                <SectionLabel>Trust</SectionLabel>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Trusted for Educational Events</h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Designed for schools, universities, organizations, seminars, workshops, and conferences where attendance
                  accuracy, security, and participant engagement matter most.
                </p>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {stats.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 80}>
                  <Card className="border-white/10 bg-white/6 text-center hover:border-emerald-400/30 hover:bg-white/9 transition-all duration-300">
                    <p className="text-4xl font-semibold text-emerald-300">{stat.value}</p>
                    <p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-300">{stat.label}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer id="contact" className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-sm text-slate-600 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="flex flex-wrap gap-4 font-medium text-slate-700">
              <a href="#problem" className="hover:text-emerald-700 transition-colors duration-150">About</a>
              <a href="#benefits" className="hover:text-emerald-700 transition-colors duration-150">Features</a>
              <a href="#contact" className="hover:text-emerald-700 transition-colors duration-150">Contact</a>
              <a href="#demo" className="hover:text-emerald-700 transition-colors duration-150">Login</a>
            </div>
            <p className="text-slate-500">© EventFlow™ – Smarter Event Management for Modern Institutions</p>
          </div>
        </footer>

      </main>
    </>
  );
}