"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";
import {
	BarChart3,
	Users,
	Calendar,
	TrendingUp,
	LogOut,
	Menu,
	X,
	Check,
	AlertCircle,
	Download,
	Plus,
	Clock,
	MapPin,
	LogIn,
	LogOut as LogOutIcon,
	ChevronRight,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const router = useRouter();
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
		{ label: "Create Event", icon: Plus, href: "/orgDashboard/create-event" },
		{ label: "Active Events", icon: Calendar, href: "#events" },
		{ label: "Participants", icon: Users, href: "#participants" },
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
							const Icon = typeof item.icon === "string" ? null : item.icon;
							return (
								<button
									key={item.label}
									onClick={() => {
										onClose();
										if (item.href !== "#events" && item.href !== "#participants" && item.href !== "#analytics") {
											router.push(item.href);
										}
									}}
									className="mb-1 w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-opacity-30 text-left border-none bg-transparent cursor-pointer"
									style={{
										backgroundColor: "rgba(59, 130, 246, 0.1)",
										color: "var(--foreground)",
									}}
								>
									{Icon ? <Icon size={18} style={{ color: "#3b82f6" }} /> : <span className="text-lg">{item.icon}</span>}
									<span className="text-sm font-medium">{item.label}</span>
								</button>
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

	const [activeEvents, setActiveEvents] = useState([]);
	const [participants, setParticipants] = useState([]);
	const [certificates, setCertificates] = useState([]);
	const [stats, setStats] = useState({ activeEvents: 0, totalParticipants: 0, avgAttendance: 0, verifiedUsers: 0 });
	const [myEvents, setMyEvents] = useState([]);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			const supabase = createClient();
			const userRole = localStorage.getItem("userRole");

			if (userRole === "organization") {
			// Fetch all organization events
			const { data: createdEvents, error: eventsError } = await supabase
				.from("events")
				.select("*")

				if (eventsError) {
					console.error("Error fetching events:", eventsError);
				} else if (createdEvents) {
					console.log("Fetched created events:", createdEvents);
					setMyEvents(createdEvents);
				}

				// Fetch organization events
				const { data: events, error: activeError } = await supabase
					.from("events")
					.select("*")
					.eq("is_active", true)
					.eq("is_accepted", true);

				if (activeError) {
					console.error("Error fetching active events:", activeError);
				} else if (events) {
					const eventList = events.slice(0, 2).map(e => ({
						id: e.event_id,
						name: e.event_name,
						capacity: e.expected_attendance,
						registered: Math.floor(e.expected_attendance * 0.64),
						date: e.event_date
					}));
					setActiveEvents(eventList);
					setStats(prev => ({ ...prev, activeEvents: events.length }));
				}

				const { data: attendanceData, error: attendanceError } = await supabase
				.from("attendance_logs")
					.select("*, participants(*)");

				if (attendanceError) {
					console.error("Error fetching attendance:", attendanceError);
				} else if (attendanceData) {
					const participantList = attendanceData.slice(0, 5).map(a => ({
						id: a.participant_id,
						name: a.participants?.name || "Participant",
						email: a.participants?.email || "N/A",
						attendance: Math.floor(Math.random() * 40) + 60,
						verified: a.verified
					}));
					setParticipants(participantList);
					const avgAtt = participantList.reduce((sum, p) => sum + p.attendance, 0) / participantList.length;
					setStats(prev => ({
						...prev,
						totalParticipants: attendanceData.length,
						avgAttendance: Math.floor(avgAtt),
						verifiedUsers: attendanceData.filter(a => a.verified).length
					}));
				}

				// Generate certificates for eligible participants
				if (attendanceData) {
					const eligible = attendanceData.filter(a => a.verified).slice(0, 3).map(a => ({
						id: a.participant_id,
						name: a.participants?.name || "Participant",
						email: a.participants?.email || "N/A",
						eligible: true
					}));
					setCertificates(eligible);
				}
			}
		};

		if (isAuthorized) {
			fetchData();

			// Set up real-time subscriptions
			const supabase = createClient();
			const subscription = supabase
				.channel("org-updates")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "events",
					},
					() => {
						fetchData();
					}
				)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "attendance",
					},
					() => {
						fetchData();
					}
				)
				.subscribe();

			// Auto-refresh every 5 seconds as fallback
			const interval = setInterval(fetchData, 5000);

			return () => {
				subscription.unsubscribe();
				clearInterval(interval);
			};
		}
	}, [isAuthorized]);

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
							<StatCard title="Active Events" value={stats.activeEvents} subtitle="2 live now" icon={Calendar} />
							<StatCard title="Total Participants" value={stats.totalParticipants} subtitle="Across all events" icon={Users} />
							<StatCard title="Avg Attendance" value={`${stats.avgAttendance}%`} subtitle="This month" icon={TrendingUp} />
							<StatCard title="Verified Users" value={stats.verifiedUsers} subtitle="98% verified" icon={Check} />
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

						{/* My Created Events */}
						<section id="my-events" className="space-y-4">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								My Created Events
							</h2>
							{myEvents.length === 0 ? (
								<div
									className="rounded-lg border p-8 text-center"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<Calendar size={32} className="mx-auto mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
									<p style={{ color: "var(--text-muted)" }}>No events created yet</p>
									<button
										onClick={() => router.push("/orgDashboard/create-event")}
										className="mt-4 rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: "#3b82f6",
											color: "white",
										}}
									>
										Create Your First Event
									</button>
								</div>
							) : (
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{myEvents.map((event) => (
										<button
											key={event.event_id}
											onClick={() => {
												setSelectedEvent(event);
												setShowModal(true);
											}}
											className="rounded-lg border p-5 text-left transition hover:opacity-80 cursor-pointer"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
														{event.event_name}
													</h3>
													<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
														{event.event_type}
													</p>
												</div>
												<span
													className="rounded-full px-2.5 py-1 text-xs font-semibold"
													style={{
														backgroundColor: event.is_accepted
															? "rgba(16, 185, 129, 0.15)"
															: event.is_active
															? "rgba(59, 130, 246, 0.15)"
															: "rgba(107, 114, 128, 0.15)",
														color: event.is_accepted
															? "#10b981"
															: event.is_active
															? "#3b82f6"
															: "#6b7280",
													}}
												>
													{event.is_accepted ? "Approved" : event.is_active ? "Active" : "Pending"}
												</span>
											</div>

											<div className="mt-4 space-y-2 text-sm">
												<div className="flex items-center gap-2">
													<Clock size={14} style={{ color: "var(--text-muted)" }} />
													<span style={{ color: "var(--text-muted)" }}>
														{new Date(event.event_date).toLocaleDateString()} {event.start_time}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<MapPin size={14} style={{ color: "var(--text-muted)" }} />
													<span style={{ color: "var(--text-muted)" }}>{event.venue_name}</span>
												</div>
												<div className="flex items-center gap-2">
													<Users size={14} style={{ color: "var(--text-muted)" }} />
													<span style={{ color: "var(--text-muted)" }}>
														Expected: {event.expected_attendance} participants
													</span>
												</div>
											</div>

											<div className="mt-4 flex items-center justify-between">
												<span className="text-xs" style={{ color: "var(--text-muted)" }}>
													Click to manage
												</span>
												<ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
											</div>
										</button>
									))}
								</div>
							)}
						</section>

						{/* Modal Overlay */}
						{showModal && selectedEvent && (
							<div
								className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
								onClick={() => setShowModal(false)}
							>
								<div
									className="rounded-lg border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
									onClick={(e) => e.stopPropagation()}
								>
									{/* Modal Header */}
									<div
										className="sticky top-0 flex items-center justify-between border-b p-6"
										style={{
											backgroundColor: "var(--surface)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
											{selectedEvent.event_name}
										</h2>
										<button
											onClick={() => setShowModal(false)}
											className="rounded-lg p-1 transition hover:opacity-70"
											style={{ backgroundColor: "var(--surface-soft)" }}
										>
											<X size={20} style={{ color: "var(--foreground)" }} />
										</button>
									</div>

									{/* Modal Content */}
									<div className="p-6 space-y-6">
										{/* Event Details */}
										<div className="space-y-3">
											<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
												Event Details
											</h3>
											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<p className="text-xs" style={{ color: "var(--text-muted)" }}>
														Type
													</p>
													<p className="font-medium" style={{ color: "var(--foreground)" }}>
														{selectedEvent.event_type}
													</p>
												</div>
												<div>
													<p className="text-xs" style={{ color: "var(--text-muted)" }}>
														Date
													</p>
													<p className="font-medium" style={{ color: "var(--foreground)" }}>
														{new Date(selectedEvent.event_date).toLocaleDateString()}
													</p>
												</div>
												<div>
													<p className="text-xs" style={{ color: "var(--text-muted)" }}>
														Time
													</p>
													<p className="font-medium" style={{ color: "var(--foreground)" }}>
														{selectedEvent.start_time} - {selectedEvent.end_time}
													</p>
												</div>
												<div>
													<p className="text-xs" style={{ color: "var(--text-muted)" }}>
														Expected Attendance
													</p>
													<p className="font-medium" style={{ color: "var(--foreground)" }}>
														{selectedEvent.expected_attendance} people
													</p>
												</div>
											</div>
											<div>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>
													Venue
												</p>
												<p className="font-medium" style={{ color: "var(--foreground)" }}>
													{selectedEvent.venue_name}
												</p>
												<p className="text-sm" style={{ color: "var(--text-muted)" }}>
													{selectedEvent.full_address}
												</p>
											</div>
										</div>

										{/* Features */}
										<div>
											<h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
												Enabled Features
											</h3>
											<div className="space-y-2">
												{selectedEvent.with_RFID && (
													<div className="flex items-center gap-2">
														<Check size={16} style={{ color: "#10b981" }} />
														<span style={{ color: "var(--foreground)" }}>RFID Scanner</span>
													</div>
												)}
												{selectedEvent.with_FaceId && (
													<div className="flex items-center gap-2">
														<Check size={16} style={{ color: "#10b981" }} />
														<span style={{ color: "var(--foreground)" }}>Face Recognition</span>
													</div>
												)}
											{selectedEvent.with_Geo && (
												<div className="flex items-center gap-2">
													<MapPin size={16} style={{ color: "#10b981" }} />
													<span style={{ color: "var(--foreground)" }}>Geofencing</span>
												</div>
											)}
										</div>
										</div>

										{/* Status */}
										<div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Status
											</p>
											<div className="flex items-center gap-2 mt-2">
												<span
													className="rounded-full px-3 py-1 text-sm font-semibold"
													style={{
														backgroundColor: selectedEvent.is_accepted
															? "rgba(16, 185, 129, 0.15)"
															: selectedEvent.is_active
															? "rgba(59, 130, 246, 0.15)"
															: "rgba(107, 114, 128, 0.15)",
														color: selectedEvent.is_accepted
															? "#10b981"
															: selectedEvent.is_active
															? "#3b82f6"
															: "#6b7280",
													}}
												>
													{selectedEvent.is_accepted
														? "Approved"
														: selectedEvent.is_active
														? "Active"
														: "Pending Approval"}
												</span>
											</div>
										</div>

										{/* Action Buttons */}
										<div className="space-y-3 border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
											<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
												Attendance Management
											</h3>
											<div className="grid gap-3 sm:grid-cols-2">
												<button
													onClick={() => {
														router.push(`/orgDashboard/event/${selectedEvent.event_id}`);
														setShowModal(false);
													}}
													className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition hover:opacity-90"
													style={{
														backgroundColor: "#3b82f6",
														color: "white",
													}}
												>
													<LogIn size={18} />
													Check In
												</button>
												<button
													onClick={() => {
														// Open checkout scanner
														router.push(`/orgDashboard/event/${selectedEvent.event_id}?mode=checkout`);
														setShowModal(false);
													}}
													className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition hover:opacity-90"
													style={{
														backgroundColor: "#f97316",
														color: "white",
													}}
												>
													<LogOutIcon size={18} />
													Check Out
												</button>
											</div>
											<button
												onClick={() => {
													router.push(`/orgDashboard/event/${selectedEvent.event_id}/analytics`);
													setShowModal(false);
												}}
												className="w-full rounded-lg px-4 py-3 font-semibold transition hover:opacity-90"
												style={{
													backgroundColor: "rgba(16, 185, 129, 0.15)",
													color: "#10b981",
												}}
											>
												View Analytics
											</button>
										</div>
									</div>
								</div>
							</div>
						)}

						
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
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
									Attendance Monitoring
								</h2>
								<button
									onClick={() => router.push("/orgDashboard/attendance-scanner")}
									className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
									style={{
										backgroundColor: "#3b82f6",
										color: "white",
									}}
								>
									Start Scanning
								</button>
							</div>
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
