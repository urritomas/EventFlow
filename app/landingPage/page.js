import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

const benefits = [
	{
		title: "RFID Attendance Tracking",
		description:
			"Fast, contactless participant check-in and check-out using RFID technology.",
		icon: "◉",
	},
	{
		title: "Facial Recognition Verification",
		description:
			"Prevents proxy attendance with real-time biometric identity confirmation.",
		icon: "◈",
	},
	{
		title: "Geofencing Security",
		description:
			"Ensures participants are physically present within the designated event location.",
		icon: "⌖",
	},
	{
		title: "Automated Certificate Generation",
		description:
			"Qualified participants receive digital certificates automatically, with no manual checking required.",
		icon: "✦",
	},
	{
		title: "Real-Time Dashboard & Analytics",
		description:
			"Track attendance, engagement, and event performance instantly.",
		icon: "▣",
	},
	{
		title: "Cloud-Based Data Management",
		description:
			"Securely store participant records, event logs, and attendance reports in real time.",
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
	},
];

function SectionLabel({ children }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 backdrop-blur">
			<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
			{children}
		</span>
	);
}

function Button({ children, href, variant = "primary" }) {
	const base =
		"inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300";
	const styles =
		variant === "primary"
			? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:brightness-110"
			: "border border-white/15 bg-white/8 text-white backdrop-blur hover:border-emerald-300/60 hover:bg-white/12";

	return (
		<Link className={`${base} ${styles}`} href={href}>
			{children}
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

export default function LandingPage() {
	return (
		<>
			<SiteHeader />
			<main className="themed-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(202,138,4,0.16),transparent_24%),linear-gradient(180deg,var(--hero-top)_0%,var(--hero-mid)_34%,var(--page-bg-soft)_34%,var(--page-bg)_100%)] text-[var(--foreground)]">
			<section className="relative isolate border-b border-white/10 text-white">
				<div className="absolute inset-0 -z-10 bg-(--hero-overlay)" />
				<div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[64px_64px] opacity-40" />
				<div className="mx-auto grid max-w-7xl gap-16 px-6 pb-20 pt-8 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-14">
					<div className="max-w-2xl">
						<SectionLabel>EventFlow™ Smart Attendance Management</SectionLabel>
						<h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
							Smarter Attendance. Stronger Security. Seamless Events.
						</h1>
						<p className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl">
							Transform how your institution manages events with RFID authentication, facial recognition, geofencing,
							and automated certificate generation all in one powerful platform.
						</p>
						<div className="mt-10 flex flex-col gap-4 sm:flex-row">
							<Button href="/hiringDetails">Get Started Today</Button>
							<Button href="/hiringDetails" variant="secondary">
								Book a Demo
							</Button>
						</div>
						<div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
							{[
								["Secure check-in", "RFID + face verification"],
								["Live control", "Attendance and location tracking"],
								["Instant output", "Certificates generated automatically"],
							].map(([title, text]) => (
								<div key={title} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
									<p className="text-sm font-semibold text-white">{title}</p>
									<p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
								</div>
							))}
						</div>
					</div>

					<div className="relative">
						<div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
						<div className="absolute -right-2 bottom-4 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
						<div className="relative rounded-4xl border border-white/10 bg-white/7 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
							<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
								<span>EventFlow Control Center</span>
								<span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300">Live</span>
							</div>
							<div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
								<Card className="bg-(--hero-card) p-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-slate-400">Attendance overview</p>
											<p className="mt-1 text-2xl font-semibold text-white">2,418 verified</p>
										</div>
										<div className="rounded-2xl bg-emerald-400/15 px-3 py-2 text-right">
											<p className="text-xs text-emerald-200">Verification rate</p>
											<p className="text-lg font-semibold text-white">98.7%</p>
										</div>
									</div>
									<div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
										{[
											["Check-ins", "1,964"],
											["Pending review", "21"],
											["Certificates released", "1,880"],
										].map(([label, value]) => (
											<div key={label} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
												<p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
												<p className="mt-2 text-xl font-semibold text-white">{value}</p>
											</div>
										))}
									</div>
								</Card>

								<div className="grid gap-4">
									<Card className="bg-(--hero-card) p-4">
										<div className="flex items-center gap-3">
											<div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/15 text-lg text-emerald-300">
												RFID
											</div>
											<div>
												<p className="text-sm text-slate-300">Tap to check in</p>
												<p className="font-semibold text-white">Contactless entry enabled</p>
											</div>
										</div>
									</Card>
									<Card className="bg-(--hero-card) p-4">
										<div className="flex items-center gap-3">
											<div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-lg text-amber-300">
												AI
											</div>
											<div>
												<p className="text-sm text-slate-300">Biometric verification</p>
												<p className="font-semibold text-white">Proxy attendance blocked</p>
											</div>
										</div>
									</Card>
									<Card className="bg-(--hero-card) p-4">
										<div className="flex items-center gap-3">
											<div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400/15 text-lg text-sky-300">
												GPS
											</div>
											<div>
												<p className="text-sm text-slate-300">Geofencing active</p>
												<p className="font-semibold text-white">Location validated in real time</p>
											</div>
										</div>
									</Card>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="problem" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
				<div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
					<div>
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
					</div>

					<Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<div className="grid gap-0 md:grid-cols-2">
							{beforeAfter.map((column) => (
								<div key={column.title} className={`bg-linear-to-br ${column.accent} border-b ${column.border} p-6 md:border-b-0 md:border-r`}>
									<p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{column.title}</p>
									<div className="mt-6 space-y-3">
										{column.items.map((item) => (
											<div key={item} className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
												{item}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
						<div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
							From manual chaos to intelligent automation, EventFlow transforms your event experience.
						</div>
					</Card>
				</div>
			</section>

			<section id="benefits" className="bg-slate-950 text-white">
				<div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
					<div className="max-w-2xl">
						<SectionLabel>Benefits</SectionLabel>
						<h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
							Designed for institutions, organizations, and event coordinators who need accuracy at scale.
						</h2>
					</div>

					<div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
						{benefits.map((benefit) => (
							<Card key={benefit.title} className="border-white/10 bg-white/6">
								<div className="flex items-start gap-4">
									  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-amber-400/15 text-xl text-emerald-300">
										{benefit.icon}
									</div>
									<div>
										<h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
										<p className="mt-2 text-sm leading-7 text-slate-300">{benefit.description}</p>
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section id="demo" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
				<div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
					<div>
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
								<span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
									{item}
								</span>
							))}
						</div>
					</div>

					<Card className="border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<div className="grid gap-4 sm:grid-cols-2">
							{[
								["RFID Authentication", "Secure badge-based access"],
								["InsightFace AI Recognition", "Real-time identity confirmation"],
								["Google Secure Authentication", "Protected institutional login"],
								["Supabase Cloud Database", "Reliable data synchronization"],
								["Real-Time Analytics Dashboard", "Instant operational visibility"],
							].map(([title, text]) => (
								<div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="font-semibold text-slate-950">{title}</p>
									<p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
								</div>
							))}
						</div>
					</Card>
				</div>
			</section>

			<section className="bg-linear-to-br from-emerald-950 via-slate-950 to-slate-900 text-white">
				<div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
					<div className="max-w-2xl">
						<SectionLabel>Trust</SectionLabel>
						<h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Trusted for Educational Events</h2>
						<p className="mt-5 text-lg leading-8 text-slate-300">
							Designed for schools, universities, organizations, seminars, workshops, and conferences where attendance
							accuracy, security, and participant engagement matter most.
						</p>
					</div>
					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{stats.map((stat) => (
							<Card key={stat.label} className="border-white/10 bg-white/6 text-center">
								<p className="text-4xl font-semibold text-emerald-300">{stat.value}</p>
								<p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-300">{stat.label}</p>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section id="cta" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
				<div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f2fbf7_45%,#fff9ea_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10 lg:p-12">
					<div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-200/60 blur-3xl" />
					<div className="absolute bottom-0 left-12 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />
					<div className="relative max-w-3xl">
						<SectionLabel>Action</SectionLabel>
						<h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
							Ready to Modernize Your Events?
						</h2>
						<p className="mt-5 text-lg leading-8 text-slate-600">
							Join institutions already moving away from paper-based attendance and toward smarter event management with
							EventFlow™.
						</p>
						<div className="mt-8 flex flex-col gap-4 sm:flex-row">
							<Button href="/hiringDetails">Start Your Free Demo</Button>
							<Button href="/hiringDetails" variant="secondary">
								Partner With Us
							</Button>
						</div>
					</div>
				</div>
			</section>

			<footer id="contact" className="border-t border-slate-200 bg-white">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-sm text-slate-600 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
					<div className="flex flex-wrap gap-4 font-medium text-slate-700">
						<a href="#problem" className="hover:text-emerald-700">
							About
						</a>
						<a href="#benefits" className="hover:text-emerald-700">
							Features
						</a>
						<a href="#cta" className="hover:text-emerald-700">
							Pricing
						</a>
						<a href="#contact" className="hover:text-emerald-700">
							Contact
						</a>
						<a href="#demo" className="hover:text-emerald-700">
							Login
						</a>
					</div>
					<p className="text-slate-500">© EventFlow™ – Smarter Event Management for Modern Institutions</p>
				</div>
			</footer>
			</main>
		</>
	);
}
