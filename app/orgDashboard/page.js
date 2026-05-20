"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import {
	BarChart3,
	Users,
	Calendar,
	MapPin,
	TrendingUp,
	LogOut,
	Menu,
	X,
	Check,
	AlertCircle,
	Download,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "#dashboard" },
		{ label: "Active Events", icon: Calendar, href: "#events" },
		{ label: "Participants", icon: Users, href: "#participants" },
		{ label: "Attendance", icon: MapPin, href: "#attendance" },
		{ label: "Certificates", icon: Check, href: "#certificates" },
		{ label: "Analytics", icon: TrendingUp, href: "#analytics" },
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
									style={{ backgroundColor: "#3b82f6", color: "white" }}
								>
									ORG
								</div>
								<span
									className="text-sm font-bold tracking-wider"
									style={{ color: "var(--foreground)" }}
								>
									ORG PANEL
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
										backgroundColor: "rgba(59, 130, 246, 0.1)",
										color: "var(--foreground)",
									}}
								>
									<Icon size={18} style={{ color: "#3b82f6" }} />
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
			className="rounded-lg border p-5 shadow-sm"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(59, 130, 246, 0.12)" }}>
				<Icon size={18} style={{ color: "#3b82f6" }} />
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

export default function OrgDashboard() {
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

	const activeEvents = [
		{ id: 1, name: "Tech Summit 2026", capacity: 500, registered: 320, date: "Jun 15, 2026" },
		{ id: 2, name: "Web Dev Workshop", capacity: 100, registered: 87, date: "Jun 22, 2026" },
	];

	const participants = [
		{ id: 1, name: "John Doe", email: "john@example.com", attendance: 94, verified: true },
		{ id: 2, name: "Jane Smith", email: "jane@example.com", attendance: 89, verified: true },
		{ id: 3, name: "Bob Wilson", email: "bob@example.com", attendance: 76, verified: false },
		{ id: 4, name: "Alice Brown", email: "alice@example.com", attendance: 100, verified: true },
		{ id: 5, name: "Charlie Davis", email: "charlie@example.com", attendance: 82, verified: true },
	];

	const certificates = [
		{ id: 1, name: "John Doe", email: "john@example.com", eligible: true },
		{ id: 2, name: "Jane Smith", email: "jane@example.com", eligible: true },
		{ id: 3, name: "Alice Brown", email: "alice@example.com", eligible: true },
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
							Organization Dashboard
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
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<StatCard title="Active Events" value="12" subtitle="2 live now" icon={Calendar} />
								<StatCard title="Total Participants" value="1,248" subtitle="Across all events" icon={Users} />
								<StatCard title="Avg Attendance" value="87%" subtitle="This month" icon={TrendingUp} />
								<StatCard title="Verified Users" value="1,156" subtitle="98% verified" icon={Check} />
							</div>
						</section>

						{/* Active Events */}
						<section id="events" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Active Events
							</h2>
							<div className="grid gap-4 md:grid-cols-2">
								{activeEvents.map((event) => (
									<div
										key={event.id}
										className="rounded-lg border p-5"
										style={{
											backgroundColor: "var(--surface)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
											{event.name}
										</h3>
										<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
											{event.date}
										</p>

										<div className="mt-4 space-y-2">
											<div className="flex items-center justify-between text-sm">
												<span style={{ color: "var(--text-muted)" }}>Capacity</span>
												<span style={{ color: "var(--foreground)" }}>
													{event.registered} / {event.capacity}
												</span>
											</div>
											<div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
												<div
													className="h-full rounded-full transition-all"
													style={{
														backgroundColor: "#3b82f6",
														width: `${(event.registered / event.capacity) * 100}%`,
													}}
												/>
											</div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												{Math.round((event.registered / event.capacity) * 100)}% registered
											</p>
										</div>
									</div>
								))}
							</div>
						</section>

						{/* Participant Management */}
						<section id="participants" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Participant Management
							</h2>
							<div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-subtle)" }}>
								<table className="w-full text-sm">
									<thead>
										<tr style={{ backgroundColor: "var(--surface-soft)", borderColor: "var(--border-subtle)" }} className="border-b">
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Name
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Email
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Attendance %
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Verified
											</th>
										</tr>
									</thead>
									<tbody>
										{participants.map((p, idx) => (
											<tr
												key={p.id}
												style={{
													backgroundColor: "var(--surface)",
													borderColor: "var(--border-subtle)",
												}}
												className={idx !== participants.length - 1 ? "border-b" : ""}
											>
												<td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
													{p.name}
												</td>
												<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
													{p.email}
												</td>
												<td className="px-4 py-3">
													<span style={{ color: "#10b981" }}>{p.attendance}%</span>
												</td>
												<td className="px-4 py-3">
													{p.verified ? (
														<span className="flex items-center gap-1" style={{ color: "#10b981" }}>
															<Check size={14} /> Yes
														</span>
													) : (
														<span className="flex items-center gap-1" style={{ color: "#fb923c" }}>
															<AlertCircle size={14} /> Pending
														</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>

						{/* Attendance Monitoring */}
						<section id="attendance" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Attendance Monitoring
							</h2>
							<div className="grid gap-4 md:grid-cols-3">
								<div
									className="rounded-lg border p-4"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
										On-Premise Attendees
									</h3>
									<p className="mt-3 text-2xl font-bold" style={{ color: "#10b981" }}>
										156
									</p>
									<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
										Real-time count
									</p>
								</div>

								<div
									className="rounded-lg border p-4"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
										Online Attendees
									</h3>
									<p className="mt-3 text-2xl font-bold" style={{ color: "#3b82f6" }}>
										89
									</p>
									<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
										Virtual participants
									</p>
								</div>

								<div
									className="rounded-lg border p-4"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
										Geofence Status
									</h3>
									<p className="mt-3 text-sm font-semibold" style={{ color: "#10b981" }}>
										Active
									</p>
									<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
										Last updated: 2 min ago
									</p>
								</div>
							</div>
						</section>

						{/* Certificate Management */}
						<section id="certificates" className="space-y-4 pb-8">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Certificate Management
							</h2>

							<div
								className="rounded-lg border p-5"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
									Eligibility Criteria
								</h3>
								<ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
									<li className="flex items-start gap-2">
										<Check size={14} className="mt-0.5" style={{ color: "#10b981" }} />
										<span>Attendance rate: 80% or higher</span>
									</li>
									<li className="flex items-start gap-2">
										<Check size={14} className="mt-0.5" style={{ color: "#10b981" }} />
										<span>ID verification: Completed</span>
									</li>
									<li className="flex items-start gap-2">
										<Check size={14} className="mt-0.5" style={{ color: "#10b981" }} />
										<span>Payment status: Confirmed</span>
									</li>
								</ul>
							</div>

							<div
								className="rounded-lg border p-5"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h3 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
									Eligible Participants ({certificates.length})
								</h3>
								<div className="space-y-2">
									{certificates.map((cert) => (
										<div key={cert.id} className="flex items-center justify-between p-2 rounded hover:bg-opacity-50">
											<div>
												<p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
													{cert.name}
												</p>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>
													{cert.email}
												</p>
											</div>
											<button className="rounded-lg px-3 py-1 text-xs font-semibold transition hover:opacity-90" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
												<Download size={12} className="inline mr-1" />
												Generate
											</button>
										</div>
									))}
								</div>
							</div>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}
