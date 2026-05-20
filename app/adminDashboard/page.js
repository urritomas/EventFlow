"use client";

import { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import {
	BarChart3,
	Users,
	TrendingUp,
	CheckCircle2,
	Menu,
	X,
	LogOut,
	Trash2,
	Edit,
	Eye,
	Search,
	Plus,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "#dashboard" },
		{ label: "Event Approvals", icon: CheckCircle2, href: "#approvals" },
		{ label: "Users", icon: Users, href: "#users" },
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
									style={{ backgroundColor: "#ef4444", color: "white" }}
								>
									AD
								</div>
								<span
									className="text-sm font-bold tracking-wider"
									style={{ color: "var(--foreground)" }}
								>
									ADMIN
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
										backgroundColor: "rgba(239, 68, 68, 0.1)",
										color: "var(--foreground)",
									}}
								>
									<Icon size={18} style={{ color: "#ef4444" }} />
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

function StatCard({ title, value, trend, icon: Icon }) {
	return (
		<div
			className="rounded-lg border p-5 shadow-sm"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.12)" }}>
				<Icon size={18} style={{ color: "#ef4444" }} />
			</div>
			<div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
				{title}
			</div>
			<div className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
				{value}
			</div>
			{trend && (
				<div className="mt-1 text-xs" style={{ color: "#10b981" }}>
					{trend}
				</div>
			)}
		</div>
	);
}

export default function AdminDashboard() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [eventApprovals, setEventApprovals] = useState([
		{ id: 1, name: "Tech Summit 2026", organizer: "TechEvents Inc", date: "Jun 15, 2026", participants: 250 },
		{ id: 2, name: "Web Dev Workshop", organizer: "CodeAcademy", date: "Jun 22, 2026", participants: 45 },
	]);

	const handleLogout = () => {
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const approveEvent = (id) => {
		setEventApprovals(eventApprovals.filter((e) => e.id !== id));
	};

	const rejectEvent = (id) => {
		setEventApprovals(eventApprovals.filter((e) => e.id !== id));
	};

	const activeEvents = [
		{ id: 1, name: "Tech Summit 2026", organizer: "TechEvents Inc", attendees: 245, status: "Active" },
		{ id: 2, name: "Web Dev Workshop", organizer: "CodeAcademy", attendees: 89, status: "Active" },
	];

	const users = [
		{ id: 1, name: "John Doe", email: "john@example.com", type: "Participant", status: "Active" },
		{ id: 2, name: "Jane Smith", email: "jane@example.com", type: "Organizer", status: "Active" },
		{ id: 3, name: "Bob Wilson", email: "bob@example.com", type: "Participant", status: "Inactive" },
		{ id: 4, name: "Alice Brown", email: "alice@example.com", type: "Organizer", status: "Active" },
	];

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
							Admin Dashboard
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
						{/* System Overview */}
						<section id="dashboard">
							<h2 className="mb-4 text-lg font-bold" style={{ color: "var(--foreground)" }}>
								System Overview
							</h2>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<StatCard title="Total Events" value="127" trend="+12 this month" icon={BarChart3} />
								<StatCard title="Pending Approvals" value={eventApprovals.length} trend="Needs attention" icon={CheckCircle2} />
								<StatCard title="Registered Users" value="1,243" trend="+45 this week" icon={Users} />
								<StatCard title="Active Organizations" value="34" trend="+2 new" icon={TrendingUp} />
							</div>
						</section>

						{/* Event Management */}
						<section className="space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
									Event Management
								</h2>
								<button
									className="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition hover:opacity-90"
									style={{
										backgroundColor: "#10b981",
										color: "white",
									}}
								>
									<Plus size={16} />
									New Event
								</button>
							</div>

							<div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-subtle)" }}>
								<table className="w-full text-sm">
									<thead>
										<tr style={{ backgroundColor: "var(--surface-soft)", borderColor: "var(--border-subtle)" }} className="border-b">
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Event Name
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Organizer
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Attendees
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Status
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{activeEvents.map((event, idx) => (
											<tr
												key={event.id}
												style={{
													backgroundColor: "var(--surface)",
													borderColor: "var(--border-subtle)",
												}}
												className={idx !== activeEvents.length - 1 ? "border-b" : ""}
											>
												<td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
													{event.name}
												</td>
												<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
													{event.organizer}
												</td>
												<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
													{event.attendees}
												</td>
												<td className="px-4 py-3">
													<span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
														{event.status}
													</span>
												</td>
												<td className="px-4 py-3 flex gap-2">
													<button className="p-1 hover:opacity-70" style={{ color: "#3b82f6" }}>
														<Eye size={14} />
													</button>
													<button className="p-1 hover:opacity-70" style={{ color: "#fb923c" }}>
														<Edit size={14} />
													</button>
													<button className="p-1 hover:opacity-70" style={{ color: "#ef4444" }}>
														<Trash2 size={14} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>

						{/* Event Approval Queue */}
						<section id="approvals" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Event Approval Queue ({eventApprovals.length})
							</h2>
							<div className="space-y-3">
								{eventApprovals.map((event) => (
									<div
										key={event.id}
										className="rounded-lg border p-4"
										style={{
											backgroundColor: "var(--surface)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
													{event.name}
												</h3>
												<p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
													Organizer: {event.organizer}
												</p>
												<p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
													Date: {event.date} | Expected participants: {event.participants}
												</p>
											</div>
											<div className="ml-4 flex gap-2">
												<button
													onClick={() => approveEvent(event.id)}
													className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
													style={{
														backgroundColor: "rgba(16, 185, 129, 0.15)",
														color: "#10b981",
													}}
												>
													Approve
												</button>
												<button
													onClick={() => rejectEvent(event.id)}
													className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
													style={{
														backgroundColor: "rgba(239, 68, 68, 0.15)",
														color: "#ef4444",
													}}
												>
													Reject
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</section>

						{/* User Management */}
						<section id="users" className="space-y-4 pb-8">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
									User Management
								</h2>
								<div
									className="relative rounded-lg border px-3 py-2"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<Search
										size={14}
										className="absolute left-3 top-1/2 -translate-y-1/2"
										style={{ color: "var(--text-muted)" }}
									/>
									<input
										type="text"
										placeholder="Search users..."
										className="w-40 bg-transparent pl-7 text-sm focus:outline-none"
										style={{ color: "var(--foreground)" }}
									/>
								</div>
							</div>

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
												Type
											</th>
											<th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
												Status
											</th>
										</tr>
									</thead>
									<tbody>
										{users.map((user, idx) => (
											<tr
												key={user.id}
												style={{
													backgroundColor: "var(--surface)",
													borderColor: "var(--border-subtle)",
												}}
												className={idx !== users.length - 1 ? "border-b" : ""}
											>
												<td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
													{user.name}
												</td>
												<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
													{user.email}
												</td>
												<td className="px-4 py-3">
													<span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
														{user.type}
													</span>
												</td>
												<td className="px-4 py-3">
													<span
														className="rounded-full px-2 py-1 text-xs font-semibold"
														style={{
															backgroundColor: user.status === "Active" ? "rgba(16, 185, 129, 0.15)" : "rgba(107, 114, 128, 0.15)",
															color: user.status === "Active" ? "#10b981" : "#6b7280",
														}}
													>
														{user.status}
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
