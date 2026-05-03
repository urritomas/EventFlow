"use client";

import { useMemo, useState } from "react";

const stages = [
  "New Applicants",
  "Under Review",
  "Email Sent",
  "Interview Scheduled",
  "Background Verification",
  "Approved",
  "Assigned to Event",
];

const overviewCards = [
  { label: "Total Applicants", value: "248", change: "+12%", progress: 78 },
  { label: "Pending Reviews", value: "42", change: "-6%", progress: 54 },
  { label: "Interview Scheduled", value: "18", change: "+9%", progress: 68 },
  { label: "Hired Staff", value: "96", change: "+18%", progress: 84 },
  { label: "Active Events", value: "7", change: "Live", progress: 62 },
];

const initialApplicants = [
  {
    id: 1,
    name: "Ava Collins",
    position: "Security Lead",
    experience: "8 years",
    availability: "Weekend / Nights",
    applicationDate: "Apr 29, 2026",
    status: "Under Review",
    email: "ava.collins@example.com",
    phone: "+1 (555) 014-2201",
    location: "Austin, TX",
    verification: 82,
    faceRecognition: "Registered",
    rfid: "Issued",
    previousExperience: "Concerts, arena operations, VIP access",
    certifications: "CPR, Crowd Control, Private Security License",
    emergencyContact: "Jordan Collins - +1 (555) 014-2202",
    notes: "Strong background in high-capacity venues.",
    avatar: "AC",
    currentEvent: "Summer Sound Festival",
  },
  {
    id: 2,
    name: "Marcus Reed",
    position: "Event Steward",
    experience: "4 years",
    availability: "Full-time",
    applicationDate: "Apr 27, 2026",
    status: "Interview Scheduled",
    email: "marcus.reed@example.com",
    phone: "+1 (555) 014-2203",
    location: "Dallas, TX",
    verification: 68,
    faceRecognition: "Pending",
    rfid: "Pending",
    previousExperience: "Corporate conferences, venue reception",
    certifications: "First Aid, Guest Services",
    emergencyContact: "Tina Reed - +1 (555) 014-2204",
    notes: "Good fit for attendee guidance and check-in support.",
    avatar: "MR",
    currentEvent: "Executive Summit",
  },
  {
    id: 3,
    name: "Nina Patel",
    position: "Access Control Officer",
    experience: "6 years",
    availability: "Day / Evening",
    applicationDate: "Apr 26, 2026",
    status: "Approved",
    email: "nina.patel@example.com",
    phone: "+1 (555) 014-2205",
    location: "Chicago, IL",
    verification: 96,
    faceRecognition: "Registered",
    rfid: "Issued",
    previousExperience: "Festivals, private venues, security ops",
    certifications: "Security Clearance, Background Verified",
    emergencyContact: "Priya Patel - +1 (555) 014-2206",
    notes: "Ready for immediate assignment.",
    avatar: "NP",
    currentEvent: "City Arena Night",
  },
  {
    id: 4,
    name: "David Kim",
    position: "RFID Check-in Staff",
    experience: "3 years",
    availability: "Flexible",
    applicationDate: "Apr 25, 2026",
    status: "New Applicants",
    email: "david.kim@example.com",
    phone: "+1 (555) 014-2207",
    location: "Los Angeles, CA",
    verification: 44,
    faceRecognition: "Not Started",
    rfid: "Pending",
    previousExperience: "Trade shows, conferences",
    certifications: "Customer Service, Badge Operations",
    emergencyContact: "Mina Kim - +1 (555) 014-2208",
    notes: "Ideal for front-of-house and registration areas.",
    avatar: "DK",
    currentEvent: "Tech Expo 2026",
  },
  {
    id: 5,
    name: "Sara Gomez",
    position: "Operations Coordinator",
    experience: "7 years",
    availability: "On call",
    applicationDate: "Apr 23, 2026",
    status: "Background Verification",
    email: "sara.gomez@example.com",
    phone: "+1 (555) 014-2209",
    location: "Phoenix, AZ",
    verification: 90,
    faceRecognition: "Registered",
    rfid: "Pending",
    previousExperience: "Multi-day festivals, staffing ops",
    certifications: "Operations Management, Safety Compliance",
    emergencyContact: "Luis Gomez - +1 (555) 014-2210",
    notes: "High confidence candidate for coordination support.",
    avatar: "SG",
    currentEvent: "Skyline Festival",
  },
];

const communicationItems = [
  "Email templates",
  "Interview invitations",
  "Contract sending",
  "Automated follow-ups",
];

const assignmentEvents = [
  "Concerts",
  "Festivals",
  "Corporate Events",
  "Conferences",
  "Venue Security Ops",
];

function ProgressBar({ value }) {
  return (
    <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-teal-400"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-white/5 text-slate-200 border-white/10",
    blue: "bg-blue-500/10 text-blue-200 border-blue-400/20",
    teal: "bg-teal-500/10 text-teal-200 border-teal-400/20",
    green: "bg-emerald-500/10 text-emerald-200 border-emerald-400/20",
    amber: "bg-amber-500/10 text-amber-200 border-amber-400/20",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [selectedId, setSelectedId] = useState(initialApplicants[0].id);
  const [draggedId, setDraggedId] = useState(null);

  const selectedApplicant = useMemo(
    () => applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0],
    [applicants, selectedId],
  );

  const applicantsByStage = useMemo(
    () =>
      stages.reduce((accumulator, stage) => {
        accumulator[stage] = applicants.filter((applicant) => applicant.status === stage);
        return accumulator;
      }, {}),
    [applicants],
  );

  function moveApplicant(id, nextStage) {
    setApplicants((current) =>
      current.map((applicant) =>
        applicant.id === id ? { ...applicant, status: nextStage } : applicant,
      ),
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="hero-blob" style={{ width: 480, height: 480, background: "radial-gradient(circle, rgba(30,144,255,0.16), transparent 55%)", top: "-8%", left: "-10%" }} />
        <div className="hero-blob" style={{ width: 420, height: 420, background: "radial-gradient(circle, rgba(22,160,133,0.12), transparent 55%)", bottom: "8%", right: "-8%" }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-xl bg-[color:var(--background)]/70">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              EF
            </div>
            <div>
              <div className="text-lg font-bold leading-none highlight">EventFlow</div>
              <div className="text-xs muted">Workforce Hiring Dashboard</div>
            </div>
          </div>
          <a href="/" className="hidden sm:inline muted text-xs hover:accent transition ml-auto mr-auto">← Back to home</a>

          <div className="flex flex-1 items-center gap-4">
            <div className="hidden md:flex flex-1 items-center rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm muted shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <span className="mr-3 text-blue-300">⌕</span>
              Search applicants, events, staff, or reports
            </div>

            <div className="hidden xl:flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200">
              Live event: Summer Sound Festival
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="glass flex h-11 w-11 items-center justify-center hover-scale" aria-label="Notifications">
              <span className="text-lg">🔔</span>
            </button>
            <div className="glass flex items-center gap-3 px-3 py-2 hover-scale">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-400 text-xs font-bold text-white">EM</div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium">Emma Lewis</div>
                <div className="text-xs muted">Operations Admin</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-6 py-6">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="glass sticky top-24 p-4 space-y-2">
            {[
              "Dashboard Overview",
              "Hiring Pipeline",
              "Applicants",
              "Interviews",
              "Approved Staff",
              "Event Assignments",
              "Attendance Tracking",
              "Reports",
              "Settings",
            ].map((item, index) => (
              <button
                key={item}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition hover:bg-white/5 ${index === 0 ? "bg-gradient-to-r from-blue-500/20 to-teal-500/10 text-white border border-white/8" : "muted"}`}
              >
                <span>{item}</span>
                {index === 0 ? <span className="text-xs text-blue-200">Active</span> : null}
              </button>
            ))}

            <div className="mt-4 rounded-2xl border border-white/8 bg-gradient-to-br from-blue-500/10 to-teal-500/10 p-4">
              <div className="text-sm font-semibold">Current active event</div>
              <div className="mt-1 text-xs muted">Summer Sound Festival • 12 staff needed</div>
              <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-teal-400" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6 pb-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map((card, index) => (
              <article key={card.label} className="glass p-5 hover-scale fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm muted">{card.label}</p>
                    <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
                  </div>
                  <Pill tone={card.change.includes("-") ? "teal" : card.change === "Live" ? "green" : "blue"}>{card.change}</Pill>
                </div>
                <ProgressBar value={card.progress} />
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
            <div className="space-y-6">
              <div className="glass p-5 fade-up">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm muted">Hiring pipeline</p>
                    <h3 className="text-2xl font-bold">Event hiring workflow</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="blue">Drag and drop enabled</Pill>
                    <Pill tone="teal">Live review</Pill>
                    <Pill tone="green">Background checks synced</Pill>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto pb-2">
                  <div className="grid min-w-[1300px] grid-cols-7 gap-4">
                    {stages.map((stage, stageIndex) => (
                      <div
                        key={stage}
                        className="glass min-h-[640px] p-3"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => draggedId && moveApplicant(draggedId, stage)}
                      >
                        <div className="mb-4 flex items-center justify-between px-2">
                          <h4 className="text-sm font-semibold">{stage}</h4>
                          <span className="rounded-full bg-white/5 px-2 py-1 text-xs muted">{applicantsByStage[stage].length}</span>
                        </div>

                        <div className="space-y-3">
                          {applicantsByStage[stage].map((applicant, applicantIndex) => (
                            <article
                              key={applicant.id}
                              draggable
                              onDragStart={() => setDraggedId(applicant.id)}
                              onDragEnd={() => setDraggedId(null)}
                              onClick={() => setSelectedId(applicant.id)}
                              className={`glass cursor-pointer p-4 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 ${selectedApplicant?.id === applicant.id ? "ring-1 ring-blue-400/40" : ""}`}
                              style={{ animationDelay: `${(stageIndex + applicantIndex) * 50}ms` }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 text-sm font-bold text-white">
                                  {applicant.avatar}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="truncate font-semibold">{applicant.name}</h5>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-teal-200">{applicant.status}</span>
                                  </div>
                                  <p className="truncate text-sm muted">{applicant.position}</p>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2 text-xs muted">
                                <div className="flex items-center justify-between gap-3"><span>Experience</span><span className="text-slate-200">{applicant.experience}</span></div>
                                <div className="flex items-center justify-between gap-3"><span>Availability</span><span className="text-slate-200">{applicant.availability}</span></div>
                                <div className="flex items-center justify-between gap-3"><span>Applied</span><span className="text-slate-200">{applicant.applicationDate}</span></div>
                              </div>
                            </article>
                          ))}

                          {!applicantsByStage[stage].length ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm muted">
                              Drop applicants here
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="glass p-5 fade-up">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm muted">Communication</p>
                      <h3 className="text-xl font-bold">Messaging and follow-ups</h3>
                    </div>
                    <Pill tone="blue">Integrated CRM</Pill>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {communicationItems.map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm">
                        <span>{item}</span>
                        <span className="text-teal-200">Open</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="glass p-5 fade-up">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm muted">Compliance & verification</p>
                      <h3 className="text-xl font-bold">Security readiness</h3>
                    </div>
                    <Pill tone="green">Verified workflow</Pill>
                  </div>

                  <div className="mt-4 space-y-4">
                    {[
                      ["Identity verification", 96],
                      ["Facial recognition enrollment", 82],
                      ["RFID badge registration", 74],
                      ["Geofence access permissions", 88],
                      ["Document completion", 91],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm">
                          <span>{label}</span>
                          <span className="muted">{value}%</span>
                        </div>
                        <ProgressBar value={value} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
              <section className="glass p-5 fade-up">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm muted">Applicant details</p>
                    <h3 className="text-2xl font-bold">{selectedApplicant.name}</h3>
                    <p className="mt-1 text-sm muted">{selectedApplicant.position}</p>
                  </div>
                  <Pill tone="blue">{selectedApplicant.status}</Pill>
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  {[
                    ["Email", selectedApplicant.email],
                    ["Phone", selectedApplicant.phone],
                    ["Location", selectedApplicant.location],
                    ["Previous event experience", selectedApplicant.previousExperience],
                    ["Certifications", selectedApplicant.certifications],
                    ["Emergency contact", selectedApplicant.emergencyContact],
                    ["Notes", selectedApplicant.notes],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide muted">{label}</div>
                      <div className="mt-1 text-slate-100">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="muted">Resume / CV</div>
                    <div className="mt-1 text-teal-200">Uploaded</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="muted">Gov ID</div>
                    <div className="mt-1 text-teal-200">Verified</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="muted">Face recognition</div>
                    <div className="mt-1 text-teal-200">{selectedApplicant.faceRecognition}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="muted">RFID status</div>
                    <div className="mt-1 text-teal-200">{selectedApplicant.rfid}</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Send Email",
                    "Schedule Interview",
                    "Approve",
                    "Reject",
                    "Assign to Event",
                  ].map((action, index) => (
                    <button key={action} className={index === 2 || index === 4 ? "btn-primary" : "glass px-4 py-3 text-sm font-medium hover-scale"}>
                      {action}
                    </button>
                  ))}
                </div>
              </section>

              <section className="glass p-5 fade-up">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm muted">Event assignments</p>
                    <h3 className="text-xl font-bold">Assign hired staff</h3>
                  </div>
                  <Pill tone="amber">Live scheduling</Pill>
                </div>

                <div className="mt-4 space-y-3">
                  {assignmentEvents.map((event) => (
                    <div key={event} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span>{event}</span>
                        <span className="text-xs muted">Open</span>
                      </div>
                      <div className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs muted">
                        Calendar slot · Drag staff here to assign
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

