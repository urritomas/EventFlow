"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import {
	Search,
	User,
	Calendar,
	MapPin,
	Clock,
	Users,
	Download,
	Eye,
	Smartphone,
	Fingerprint,
	LogOut,
	Menu,
	X,
	BarChart3,
	Award,
	CheckCircle,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "#dashboard" },
		{ label: "Profile", icon: User, href: "#profile" },
		{ label: "Events", icon: Search, href: "#events" },
		{ label: "Attendance", icon: Smartphone, href: "#attendance" },
		{ label: "Certificates", icon: Award, href: "#certificates" },
		{ label: "History", icon: Calendar, href: "#registered" },
	];

	return (
		<>
			{isOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose} />}
			<aside
				className={`fixed left-0 top-0 z-40 h-screen w-64 transform transition-transform duration-300 md:relative md:translate-x-0 ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
				style={{
					backgroundColor: "var(--page-bg-soft)",
					borderRight: "1px solid var(--border-subtle)",
				}}
			>
				<div className="flex h-full flex-col">
					<div className="border-b border-white/10 px-6 py-5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div
									className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm"
									style={{ backgroundColor: "#10b981", color: "white" }}
								>
									EF
								</div>
								<span
									className="text-sm font-bold tracking-wider"
									style={{ color: "var(--foreground)" }}
								>
									EVENTFLOW
								</span>
							</div>
							<button
								onClick={onClose}
								className="md:hidden p-2 hover:opacity-70 transition"
								style={{ color: "var(--foreground)" }}
							>
								<X size={20} />
							</button>
						</div>
					</div>

					<nav className="flex-1 overflow-y-auto px-4 py-6">
						{menuItems.map((item) => {
							const Icon = item.icon;
							return (
								<a
									key={item.label}
									href={item.href}
									onClick={onClose}
									className="mb-1 flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-opacity-30"
									style={{
										backgroundColor: "rgba(16, 185, 129, 0.1)",
										color: "var(--foreground)",
									}}
								>
									<Icon size={18} style={{ color: "#10b981" }} />
									<span className="text-sm font-medium">{item.label}</span>
								</a>
							);
						})}
					</nav>

					<div className="border-t border-white/10 px-4 py-4">
						<button
							onClick={onLogout}
							className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-opacity-80 text-sm font-medium"
							style={{
								backgroundColor: "rgba(239, 68, 68, 0.12)",
								color: "#ef4444",
							}}
						>
							<LogOut size={16} />
							<span>Logout</span>
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}

function StatCard({ title, value, subtitle, icon: Icon }) {
	return (
		<div
			className="rounded-lg border p-5 shadow-sm transition-all hover:shadow-md"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}>
				<Icon size={18} style={{ color: "#10b981" }} />
			</div>
			<div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
				{title}
			</div>
			<div className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
				{value}
			</div>
			{subtitle && (
				<div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
					{subtitle}
				</div>
			)}
		</div>
	);
}

function EventCard({ event }) {
	return (
		<div
			className="rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			<div className="mb-3 flex items-start justify-between">
				<h4 className="font-semibold text-sm pr-2" style={{ color: "var(--foreground)" }}>
					{event.name}
				</h4>
				<div
					className="rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap"
					style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
				>
					{event.status}
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<MapPin size={12} />
					<span>{event.venue}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Calendar size={12} />
					<span>{event.date}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Clock size={12} />
					<span>{event.time}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Users size={12} />
					<span>{event.attendees} attendees</span>
				</div>
			</div>

			<button
				className="mt-3 w-full rounded-lg px-3 py-2 font-medium text-xs transition hover:opacity-90"
				style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
			>
				View Details
			</button>
		</div>
	);
}

export default function PersonalDashboard() {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);

	useEffect(() => {
		const isLoggedIn = localStorage.getItem("isLoggedIn");
		if (!isLoggedIn) {
			router.push("/landingPage");
		} else {
			setIsAuthorized(true);
		}
	}, [router]);

	const handleLogout = () => {
		localStorage.removeItem("isLoggedIn");
		localStorage.removeItem("userRole");
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const upcomingEvents = [
		{ id: 1, name: "Tech Summit 2026", venue: "Convention Center, NYC", date: "Jun 15, 2026", time: "09:00 AM", attendees: 245, status: "Registered" },
		{ id: 2, name: "Web Dev Workshop", venue: "Tech Hub, San Francisco", date: "Jun 22, 2026", time: "02:00 PM", attendees: 89, status: "Registered" },
		{ id: 3, name: "AI Conference", venue: "Virtual", date: "Jul 05, 2026", time: "10:00 AM", attendees: 512, status: "Interested" },
	];

	const certificates = [
		{ id: 1, title: "Advanced JavaScript", event: "JavaScript Mastery", date: "May 10, 2026" },
		{ id: 2, title: "React Developer", event: "Modern React", date: "Apr 28, 2026" },
		{ id: 3, title: "Event Management", event: "Planning Fundamentals", date: "Apr 15, 2026" },
	];

	const registeredEvents = [
		{ id: 1, name: "GraphQL Basics", date: "May 20, 2026", status: "Completed" },
		{ id: 2, name: "TypeScript Advanced", date: "Jun 10, 2026", status: "Upcoming" },
		{ id: 3, name: "Next.js Full Stack", date: "Jun 25, 2026", status: "Registered" },
	];

	if (!isAuthorized) return null;

	return (
		<div className="min-h-screen themed-screen" style={{ backgroundColor: "var(--page-bg)" }}>
			<SiteHeader showBack={true} />
			<div className="flex">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

				<main className="flex-1 overflow-y-auto h-screen">
					<div
						className="sticky top-0 z-20 border-b px-6 py-3 flex items-center justify-between"
						style={{
							backgroundColor: "var(--surface)",
							borderColor: "var(--border-subtle)",
						}}
					>
						<h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
							My Dashboard
						</h1>
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="rounded-lg p-2 transition hover:opacity-80 md:hidden"
							style={{ backgroundColor: "var(--surface-soft)" }}
						>
							<Menu size={20} style={{ color: "var(--foreground)" }} />
						</button>
					</div>

					<div className="space-y-8 overflow-y-auto p-6 md:p-8">
						{/* Overview */}
						<section id="dashboard">
							<h2 className="mb-4 text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Overview
							</h2>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<StatCard title="Registered Events" value="8" subtitle="4 upcoming" icon={Calendar} />
								<StatCard title="Certificates Earned" value="12" subtitle="This month" icon={Award} />
								<StatCard title="Attendance Rate" value="94%" subtitle="Excellent" icon={Users} />
							</div>
						</section>

						{/* Profile Setup */}
						<section id="profile" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Profile Setup
							</h2>
							<div
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
											Full Name
										</label>
										<input
											type="text"
											placeholder="John Doe"
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
									<div>
										<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
											Email
										</label>
										<input
											type="email"
											placeholder="john@example.com"
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
									<div>
										<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
											ID Number
										</label>
										<input
											type="text"
											placeholder="ID-001234567"
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
									<div>
										<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
											Phone
										</label>
										<input
											type="tel"
											placeholder="+1 (555) 123-4567"
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
								</div>
								<button
									className="mt-6 w-full rounded-lg px-6 py-2 font-semibold text-sm transition hover:opacity-90"
									style={{
										backgroundColor: "#10b981",
										color: "white",
									}}
								>
									Save Profile
								</button>
							</div>
						</section>

						{/* Event Discovery */}
						<section id="events" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Event Discovery
							</h2>

							<div
								className="relative rounded-lg border px-4 py-3"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<Search
									size={16}
									className="absolute left-4 top-1/2 -translate-y-1/2"
									style={{ color: "var(--text-muted)" }}
								/>
								<input
									type="text"
									placeholder="Search events..."
									className="w-full bg-transparent pl-8 text-sm focus:outline-none"
									style={{ color: "var(--foreground)" }}
								/>
							</div>

							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{upcomingEvents.map((event) => (
									<EventCard key={event.id} event={event} />
								))}
							</div>
						</section>

						{/* Attendance Setup */}
						<section id="attendance" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Attendance Setup
							</h2>
							<div className="grid gap-4 md:grid-cols-2">
								<div
									className="rounded-lg border p-6"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}>
										<Fingerprint size={20} style={{ color: "#10b981" }} />
									</div>
									<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
										Face ID Registration
									</h3>
									<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
										Register your face for secure event check-in
									</p>
									<button
										className="mt-4 w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: "rgba(16, 185, 129, 0.15)",
											color: "#10b981",
										}}
									>
										Register Face ID
									</button>
									<p className="mt-3 text-xs font-semibold flex items-center gap-1.5" style={{ color: "#10b981" }}>
										<CheckCircle size={13} /> Registered
									</p>
								</div>

								<div
									className="rounded-lg border p-6"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(59, 130, 246, 0.12)" }}>
										<Smartphone size={20} style={{ color: "#3b82f6" }} />
									</div>
									<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
										RFID Card Registration
									</h3>
									<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
										Link your RFID card for automated tracking
									</p>
									<div className="mt-4 rounded-lg border border-dashed p-4 text-center" style={{ borderColor: "rgba(59, 130, 246, 0.3)" }}>
										<Smartphone size={24} style={{ color: "#3b82f6", opacity: 0.5 }} />
										<p className="mt-2 text-xs font-semibold" style={{ color: "#3b82f6" }}>
											Tap RFID card
										</p>
									</div>
								</div>
							</div>
						</section>

						{/* Certificates */}
						<section id="certificates" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Certificates & Achievements
							</h2>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{certificates.map((cert) => (
									<div
										key={cert.id}
										className="rounded-lg border p-4"
										style={{
											backgroundColor: "var(--surface)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(251, 146, 60, 0.12)" }}>
											<Award size={18} style={{ color: "#fb923c" }} />
										</div>
										<h4 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
											{cert.title}
										</h4>
										<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
											{cert.event}
										</p>
										<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
											{cert.date}
										</p>
										<div className="mt-3 flex gap-2">
											<button
												className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition hover:opacity-90"
												style={{
													backgroundColor: "rgba(16, 185, 129, 0.15)",
													color: "#10b981",
												}}
											>
												<Eye size={12} />
												View
											</button>
											<button
												className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition hover:opacity-90"
												style={{
													backgroundColor: "rgba(16, 185, 129, 0.15)",
													color: "#10b981",
												}}
											>
												<Download size={12} />
												Download
											</button>
										</div>
									</div>
								))}
							</div>
						</section>

						{/* Event History */}
						<section id="registered" className="space-y-4 pb-8">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Event History
							</h2>
							<div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-subtle)" }}>
								<table className="w-full text-sm">
									<thead>
										<tr style={{ backgroundColor: "var(--surface-soft)", borderColor: "var(--border-subtle)" }} className="border-b">
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Event
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Date
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Status
											</th>
										</tr>
									</thead>
									<tbody>
										{registeredEvents.map((event, idx) => (
											<tr
												key={event.id}
												style={{
													backgroundColor: "var(--surface)",
													borderColor: "var(--border-subtle)",
												}}
												className={idx !== registeredEvents.length - 1 ? "border-b" : ""}
											>
												<td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
													{event.name}
												</td>
												<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
													{event.date}
												</td>
												<td className="px-4 py-3">
													<span
														className="rounded-full px-2 py-1 text-xs font-semibold"
														style={{
															backgroundColor:
																event.status === "Completed"
																	? "rgba(16, 185, 129, 0.15)"
																	: event.status === "Upcoming"
																		? "rgba(59, 130, 246, 0.15)"
																		: "rgba(251, 146, 60, 0.15)",
															color:
																event.status === "Completed"
																	? "#10b981"
																	: event.status === "Upcoming"
																		? "#3b82f6"
																		: "#fb923c",
														}}
													>
														{event.status}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}
