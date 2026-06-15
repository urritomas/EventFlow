"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";
import { clearSession } from "@/utils/auth/session";
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
	LogIn,
	LogOut as LogOutIcon,
	ChevronRight,
	Clock,
	MapPin,
	Search,
	ClipboardList,
	SlidersHorizontal,
	User,
	Trash2,
	ShieldCheck,
} from "lucide-react";

	function Sidebar({ isOpen, onClose, onLogout }) {
		const router = useRouter();
		const menuItems = [
			{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
			{ label: "Create Event", icon: Plus, href: "/orgDashboard/create-event" },
			{ label: "Registration Confirmation", icon: ShieldCheck, href: "/orgDashboard/performance-registrations" },
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
								<span className="text-sm font-bold tracking-wider" style={{ color: "var(--foreground)" }}>
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
										if (item.href !== "#events") {
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
		clearSession();
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const handleDeleteEvent = async () => {
		if (!eventToDelete) return;

		setIsDeleting(true);
		const eventIdToDelete = eventToDelete.event_id;
		const eventNameToDelete = eventToDelete.event_name;
		const eventIdStr = String(eventIdToDelete);

		try {
			// Call API route with service role to bypass RLS
			const response = await fetch("/api/admin/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "delete", id: eventIdToDelete }),
			});

			const result = await response.json();

			if (!response.ok) {
				alert("Failed to delete event: " + (result.error?.message || "Unknown error"));
			} else {
				setMyEvents((prev) => prev.filter((e) => String(e.event_id) !== eventIdStr));
				setActiveEvents((prev) => prev.filter((e) => String(e.id) !== eventIdStr));
				if (selectedEvent && String(selectedEvent.event_id) === eventIdStr) {
					setSelectedEvent(null);
					setShowModal(false);
				}
				setShowDeleteModal(false);
				setEventToDelete(null);
			}
		} catch (error) {
			console.error("[Delete] Exception:", error);
			alert("Exception while deleting: " + error.message);
		} finally {
			setIsDeleting(false);
		}
	};

	const openDeleteModal = (event) => {
		setEventToDelete(event);
		setShowDeleteModal(true);
	};

	const [activeEvents, setActiveEvents] = useState([]);
	const [stats, setStats] = useState({ activeEvents: 0, totalParticipants: 0, avgAttendance: 0, verifiedUsers: 0 });
	const [myEvents, setMyEvents] = useState([]);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [eventToDelete, setEventToDelete] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [attendanceStats, setAttendanceStats] = useState({ onPremise: 0, online: 0, geofenceActive: false });
	const [registrations, setRegistrations] = useState([]);
	const [selectedRegistration, setSelectedRegistration] = useState(null);
	const [reviewModal, setReviewModal] = useState(false);
	const [registrationAction, setRegistrationAction] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [registrationMessage, setRegistrationMessage] = useState("");

	useEffect(() => {
		const fetchData = async () => {
			const supabase = createClient();
			const userRole = localStorage.getItem("userRole");

			if (userRole === "organization") {
				const orgLoginId = localStorage.getItem("loginId");
				let eventsQuery = supabase.from("events").select("*");
				if (orgLoginId) {
					eventsQuery = eventsQuery.eq("org_login_id", parseInt(orgLoginId, 10));
				}

				const { data: createdEvents, error: eventsError } = await eventsQuery;

				if (eventsError) {
					console.error("Error fetching events:", eventsError);
				} else if (createdEvents) {
					setMyEvents(createdEvents);
				}

				let activeQuery = supabase
					.from("events")
					.select("*")
					.eq("is_active", true)
					.eq("is_accepted", true);
				if (orgLoginId) {
					activeQuery = activeQuery.eq("org_login_id", parseInt(orgLoginId, 10));
				}

				const { data: events, error: activeError } = await activeQuery;

				if (activeError) {
					console.error("Error fetching active events:", activeError);
				} else if (events) {
					// Fetch actual registered counts from event_participants
					const { data: allRegistrations } = await supabase
						.from("event_participants")
						.select("event_id");

					const registrationCounts = {};
					if (allRegistrations) {
						allRegistrations.forEach((r) => {
							registrationCounts[r.event_id] = (registrationCounts[r.event_id] || 0) + 1;
						});
					}

					const eventList = events.slice(0, 2).map((e) => ({
						id: e.event_id,
						name: e.event_name,
						capacity: e.expected_attendance || 0,
						registered: registrationCounts[e.event_id] || 0,
						date: e.event_date,
						with_Geo: e.with_Geo,
					}));
					setActiveEvents(eventList);
					setStats((prev) => ({ ...prev, activeEvents: events.length }));
				}
			}
		};

		if (isAuthorized) {
			fetchData();

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
				.subscribe();

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
						<section id="dashboard" className="ef-animate-fade-in">
							<h2 className="mb-4 text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Overview
							</h2>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<StatCard title="Active Events" value={stats.activeEvents} subtitle="2 live now" icon={Calendar} />
								<StatCard
									title="Total Participants"
									value={stats.totalParticipants}
									subtitle="Across all events"
									icon={Users}
								/>
								<StatCard title="Avg Attendance" value={`${stats.avgAttendance}%`} subtitle="This month" icon={TrendingUp} />
								<StatCard title="Verified Users" value={stats.verifiedUsers} subtitle="98% verified" icon={Check} />
							</div>
						</section>

						{/* Active Events */}
						<section id="events" className="space-y-4 ef-animate-fade-in ef-animate-delay-1">
							<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								Active Events
							</h2>
							<div className="grid gap-4 md:grid-cols-2">
								{activeEvents.map((event) => (
									<div
										key={event.id}
										className="rounded-lg border p-5 ef-animate-fade-in"
										style={{
											backgroundColor: "var(--surface)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
											{event.name}
										</h3>
										<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{event.date}</p>

										<div className="mt-4 space-y-2">
											<div className="flex items-center justify-between text-sm">
												<span style={{ color: "var(--text-muted)" }}>Capacity</span>
												<span style={{ color: "var(--foreground)" }}>
													{event.registered} / {event.capacity}
												</span>
											</div>
											<div
												className="h-2 rounded-full overflow-hidden"
												style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
											>
												<div
													className="h-full rounded-full transition-all"
													style={{
														backgroundColor: "#3b82f6",
														width: event.capacity > 0 ? `${(event.registered / event.capacity) * 100}%` : "0%",
													}}
												/>
											</div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												{event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0}% registered
											</p>
										</div>
									</div>
								))}
							</div>
						</section>

						{/* My Created Events */}
						<section id="my-events" className="space-y-4 ef-animate-fade-in ef-animate-delay-2">
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
										Create Your Event
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
											className="rounded-lg border p-5 text-left transition hover:opacity-80 cursor-pointer ef-animate-fade-in scale-100 hover:scale-[102%]"
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
												<div className="flex items-center gap-2">
													{event.with_Geo && (
														<span
															onClick={(e) => {
																e.stopPropagation();
																router.push(`/orgDashboard/event/${event.event_id}`);
															}}
															className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer transition hover:opacity-90"
															style={{
																backgroundColor: "rgba(16, 185, 129, 0.15)",
																color: "#10b981",
															}}
														>
															<MapPin size={12} />
															Geofence
														</span>
													)}
													<ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
												</div>
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
													openDeleteModal(selectedEvent);
												}}
												className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition hover:opacity-90"
												style={{
													backgroundColor: "rgba(239, 68, 68, 0.1)",
													color: "#ef4444",
													border: "1px solid rgba(239, 68, 68, 0.3)",
												}}
											>
												<Trash2 size={18} />
												Delete Event
											</button>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Attendance Monitoring */}
						<section id="attendance" className="space-y-4 ef-animate-fade-in ef-animate-delay-3">
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
						<section id="certificates" className="space-y-4 pb-8 ef-animate-fade-in ef-animate-delay-4">
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
						</section>
					</div>
				</main>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && eventToDelete && (
				<div
					className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
					onClick={() => setShowDeleteModal(false)}
				>
					<div
						className="rounded-lg border max-w-md w-full p-6"
						style={{
							backgroundColor: "var(--surface)",
							borderColor: "var(--border-subtle)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 mb-4">
							<div
								className="rounded-full p-2"
								style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
							>
								<Trash2 size={24} style={{ color: "#ef4444" }} />
							</div>
							<h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
								Delete Event
							</h2>
						</div>
						<p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
							Are you sure you want to delete <strong style={{ color: "var(--foreground)" }}>{eventToDelete.event_name}</strong>? This action cannot be undone. All associated data including registrations and attendance records will be permanently removed.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowDeleteModal(false)}
								disabled={isDeleting}
								className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-80"
								style={{
									backgroundColor: "var(--surface-soft)",
									color: "var(--foreground)",
								}}
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteEvent}
								disabled={isDeleting}
								className="rounded-lg px-4 py-2 font-semibold text-sm text-white transition hover:opacity-90"
								style={{
									backgroundColor: "#ef4444",
								}}
							>
								{isDeleting ? "Deleting..." : "Delete Event"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
