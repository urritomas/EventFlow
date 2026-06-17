"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../../components/SiteHeader";
import {
	CheckCircle2,
	XCircle,
	Clock,
	Users,
	Calendar,
	AlertTriangle,
	AlertCircle,
	TrendingUp,
	TrendingDown,
	Search,
	ArrowLeft,
	ShieldCheck,
	ClipboardList,
	Filter,
	Info,
	LogOut,
	Menu,
	X,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const router = useRouter();
	const menuItems = [
		{ label: "Dashboard", href: "/orgDashboard" },
		{ label: "Create Event", href: "/orgDashboard/create-event" },
		{ label: "Registration Confirmation", href: "/orgDashboard/performance-registrations" },
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
						{menuItems.map((item) => (
							<button
								key={item.label}
								onClick={() => {
									onClose();
									router.push(item.href);
								}}
								className="mb-1 w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-opacity-30 text-left border-none bg-transparent cursor-pointer"
								style={{
									backgroundColor:
										item.href === "/orgDashboard/performance-registrations"
											? "rgba(59, 130, 246, 0.2)"
											: "rgba(59, 130, 246, 0.1)",
									color: "var(--foreground)",
								}}
							>
								<ShieldCheck size={18} style={{ color: "#3b82f6" }} />
								<span className="text-sm font-medium">{item.label}</span>
							</button>
						))}
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

function MetricBadge({ label, value, unit = "", color = "#3b82f6" }) {
	return (
		<div className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
			<p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
			<p className="text-sm font-bold mt-1" style={{ color }}>
				{value}
				{unit && <span style={{ color: "var(--text-muted)" }}>{unit}</span>}
			</p>
		</div>
	);
}

function PerformanceScoreBar({ score }) {
	const ratio = Math.min(Math.max(score ?? 0, 0), 100);
	const color = ratio >= 70 ? "#10b981" : ratio >= 40 ? "#eab308" : "#ef4444";

	return (
		<div className="mt-3">
			<div className="flex items-center justify-between text-xs">
				<span style={{ color: "var(--text-muted)" }}>Performance Score</span>
				<span className="font-bold" style={{ color }}>
					{ratio}/100
				</span>
			</div>
			<div className="mt-1.5 h-2 rounded-full" style={{ backgroundColor: "rgba(107, 114, 128, 0.15)" }}>
				<div className="h-2 rounded-full transition-all" style={{ width: `${ratio}%`, backgroundColor: color }} />
			</div>
		</div>
	);
}

export default function PerformanceRegistrationsPage() {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [myEvents, setMyEvents] = useState([]);
	const [selectedEventId, setSelectedEventId] = useState("");
	const [registrations, setRegistrations] = useState([]);
	const [reviewStats, setReviewStats] = useState({ total: 0, pending: 0 });
	const [loading, setLoading] = useState(true);
	const [reviewingId, setReviewingId] = useState(null);
	const [reviewAction, setReviewAction] = useState(null);
	const [reviewNotes, setReviewNotes] = useState({});
	const [actionLoading, setActionLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");

	useEffect(() => {
		const isLoggedIn = localStorage.getItem("isLoggedIn");
		const userRole = localStorage.getItem("userRole");
		if (!isLoggedIn || userRole !== "organization") {
			router.push("/login");
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

	const loadEvents = async () => {
		try {
			const orgLoginId = localStorage.getItem("loginId");
			const headers = new Headers();
			headers.set("Content-Type", "application/json");
			if (orgLoginId) {
				headers.set("x-org-login-id", orgLoginId);
			}

			const res = await fetch(`/api/admin/events?action=org-events`, { headers });
			const json = await res.json();
			const data = json.data || [];

			if (!res.ok) {
				console.error("[PerformanceRegistrations] API error:", json.error);
				return;
			}

			setMyEvents(data);
			if (data.length > 0 && !selectedEventId) {
				setSelectedEventId(String(data[0].event_id));
			}
		} catch (error) {
			console.error("[PerformanceRegistrations] loadEvents error:", error);
		}
	};

	const loadRegistrations = async () => {
		if (!selectedEventId) return;
		setLoading(true);

		try {
			const res = await fetch(`/api/registration-review?eventId=${encodeURIComponent(selectedEventId)}`);
			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(data?.error || data?.details || "Failed to load registrations");
			}

			const registrationsSource = Array.isArray(data.registrations) ? data.registrations : [];
			setRegistrations(registrationsSource);
			setReviewStats({ total: Number(data.total ?? registrationsSource.length), pending: Number(data.pending ?? 0) });
		} catch (error) {
			console.error("Error loading registrations:", error);
			setRegistrations([]);
			setReviewStats({ total: 0, pending: 0 });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (isAuthorized) {
			loadEvents();
		}
	}, [isAuthorized]);

	useEffect(() => {
		if (selectedEventId) {
			loadRegistrations();
		}
	}, [selectedEventId]);

	const handleReview = async (registrationId, participantId) => {
		const action = reviewAction;
		if (!action) return;

		setActionLoading(true);
		try {
			const res = await fetch("/api/registration-review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					eventId: selectedEventId,
					participantId,
					action,
					organizerNotes: reviewNotes[registrationId] || "",
				}),
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || "Failed to update registration");
			}

			setRegistrations((prev) =>
				prev.map((reg) =>
					reg.id === registrationId
						? {
								...reg,
								reviewStatus: action,
								organizerNotes: result.organizerNotes,
								reviewedAt: result.reviewedAt || new Date().toISOString(),
							}
						: reg
				)
			);

			setReviewingId(null);
			setReviewAction(null);
		} catch (error) {
			console.error("Review error:", error);
			alert("Failed to update registration: " + error.message);
		} finally {
			setActionLoading(false);
		}
	};

	const selectedEvent = myEvents.find((e) => String(e.event_id) === selectedEventId);

	const filteredRegistrations = registrations.filter((reg) => {
		const matchesSearch =
			!searchQuery ||
			reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(reg.email && reg.email.toLowerCase().includes(searchQuery.toLowerCase()));
		const matchesFilter =
			filterStatus === "all" ||
			(filterStatus === "pending" && reg.reviewStatus === "pending") ||
			(filterStatus === "accepted" && reg.reviewStatus === "accepted") ||
			(filterStatus === "declined" && reg.reviewStatus === "declined");
		return matchesSearch && matchesFilter;
	});

	const pendingCount = registrations.filter((r) => r.reviewStatus === "pending").length;
	const acceptedCount = registrations.filter((r) => r.reviewStatus === "accepted").length;
	const declinedCount = registrations.filter((r) => r.reviewStatus === "declined").length;

	if (!isAuthorized) return null;

	return (
		<div className="min-h-screen themed-screen" style={{ backgroundColor: "var(--page-bg)" }}>
			<SiteHeader showBack />
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
						<div className="flex items-center gap-3">
							<button
								onClick={() => router.push("/orgDashboard")}
								className="p-2 hover:opacity-70 transition rounded-lg"
								style={{ color: "var(--foreground)", backgroundColor: "var(--surface-soft)" }}
							>
								<ArrowLeft size={18} />
							</button>
							<div>
								<h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
									Registration Confirmation
								</h1>
								<p className="text-xs" style={{ color: "var(--text-muted)" }}>
									Review applicants based on performance before accepting
								</p>
							</div>
						</div>
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="rounded-lg p-2 transition hover:opacity-80 md:hidden"
							style={{ backgroundColor: "var(--surface-soft)" }}
						>
							<Menu size={20} style={{ color: "var(--foreground)" }} />
						</button>
					</div>

					<div className="space-y-6 overflow-y-auto p-6 md:p-8">
						{/* Event Selector */}
						<section>
							<div className="flex items-center gap-3 mb-4">
								<Calendar size={18} style={{ color: "#3b82f6" }} />
								<h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
									Select Event to Review
								</h2>
							</div>
							{myEvents.length === 0 ? (
								<div
									className="rounded-lg border p-6 text-center"
									style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
								>
									<Calendar size={32} className="mx-auto mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
									<p style={{ color: "var(--text-muted)" }}>No events available</p>
								</div>
							) : (
								<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
									{myEvents.map((event) => {
										const eventIdStr = String(event.event_id);
										return (
											<button
												key={event.event_id}
												onClick={() => setSelectedEventId(eventIdStr)}
												className="rounded-lg border p-4 text-left transition hover:opacity-80"
												style={{
													backgroundColor: selectedEventId === eventIdStr ? "rgba(59, 130, 246, 0.1)" : "var(--surface)",
													borderColor: selectedEventId === eventIdStr ? "#3b82f6" : "var(--border-subtle)",
												}}
											>
												<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
													{event.event_name}
												</h3>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													{new Date(event.event_date).toLocaleDateString()}
												</p>
												<div className="mt-2 flex items-center gap-2">
													<span
														className="rounded-full px-2 py-0.5 text-xs font-semibold"
														style={{
															backgroundColor: reviewStats.pending > 0 ? "rgba(234, 179, 8, 0.15)" : "rgba(16, 185, 129, 0.15)",
															color: reviewStats.pending > 0 ? "#eab308" : "#10b981",
														}}
													>
														{reviewStats.pending} pending
													</span>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</section>

						{/* Registration Review Area */}
						{selectedEventId && (
							<section>
								{/* Stats Row */}
								<div className="grid gap-4 sm:grid-cols-3 mb-6">
									<div
										className="rounded-lg border p-4"
										style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>Pending Review</p>
												<p className="text-2xl font-bold" style={{ color: "#eab308" }}>{pendingCount}</p>
											</div>
											<Clock size={20} style={{ color: "#eab308" }} />
										</div>
									</div>
									<div
										className="rounded-lg border p-4"
										style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>Accepted</p>
												<p className="text-2xl font-bold" style={{ color: "#10b981" }}>{acceptedCount}</p>
											</div>
											<CheckCircle2 size={20} style={{ color: "#10b981" }} />
										</div>
									</div>
									<div
										className="rounded-lg border p-4"
										style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>Declined</p>
												<p className="text-2xl font-bold" style={{ color: "#ef4444" }}>{declinedCount}</p>
											</div>
											<XCircle size={20} style={{ color: "#ef4444" }} />
										</div>
									</div>
								</div>

								{/* Filters */}
								<div className="flex flex-col sm:flex-row gap-3 mb-6">
									<div className="relative flex-1">
										<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
										<input
											type="text"
											placeholder="Search by name or email..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full rounded-lg border pl-9 pr-4 py-2 text-sm"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
									<div className="flex items-center gap-2">
										<Filter size={16} style={{ color: "var(--text-muted)" }} />
										<select
											value={filterStatus}
											onChange={(e) => setFilterStatus(e.target.value)}
											className="rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										>
											<option value="all">All ({reviewStats.total})</option>
											<option value="pending">Pending ({pendingCount})</option>
											<option value="accepted">Accepted ({acceptedCount})</option>
											<option value="declined">Declined ({declinedCount})</option>
										</select>
									</div>
								</div>

								{/* Registrations List */}
								{loading ? (
									<div className="text-center py-12">
										<div
											className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
											style={{ borderColor: "#3b82f6" }}
										/>
										<p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
											Loading registrations...
										</p>
									</div>
								) : filteredRegistrations.length === 0 ? (
									<div className="text-center py-12 rounded-lg border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}>
										<p style={{ color: "var(--text-muted)" }}>No registrations match your filter</p>
									</div>
								) : (
									<div className="space-y-4">
										{filteredRegistrations.map((reg) => {
											const isPending = reg.reviewStatus === "pending";
											const isAccepted = reg.reviewStatus === "accepted";
											const isDeclined = reg.reviewStatus === "declined";
											const isReviewing = reviewingId === reg.id;

											return (
												<div
													key={reg.id}
													className="rounded-lg border p-5"
													style={{
														backgroundColor: "var(--surface)",
														borderColor: isPending ? "rgba(234, 179, 8, 0.3)" : isAccepted ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
													}}
												>
													{/* Header */}
													<div className="flex items-start justify-between">
														<div className="flex items-start gap-3">
															<div
																className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
																style={{
																	backgroundColor: isPending ? "rgba(234, 179, 8, 0.15)" : isAccepted ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
																	color: isPending ? "#eab308" : isAccepted ? "#10b981" : "#ef4444",
																}}
															>
																{reg.name?.charAt(0) || "?"}
															</div>
															<div>
																<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																	{reg.name}
																</h3>
																<p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
																	{reg.email || "No email provided"}
																</p>
																{reg.rfid && (
																	<p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
																		RFID: {reg.rfid}
																	</p>
																)}
															</div>
														</div>
														<span
															className="rounded-full px-2.5 py-1 text-xs font-semibold"
															style={{
																backgroundColor: isPending ? "rgba(234, 179, 8, 0.15)" : isAccepted ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
																color: isPending ? "#eab308" : isAccepted ? "#10b981" : "#ef4444",
															}}
														>
															{isPending ? "Pending Review" : isAccepted ? "Accepted" : "Declined"}
														</span>
													</div>

													{/* Performance Metrics */}
													{reg.metrics && (
														<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
															<MetricBadge label="Attendance Rate" value={`${reg.metrics.attendanceRate}%`} color="#10b981" />
															<MetricBadge label="Events Attended" value={reg.metrics.totalEventsAttended} unit={`/${reg.metrics.totalEventsRegistered}`} color="#3b82f6" />
															<MetricBadge label="Absences" value={reg.metrics.absences} color={reg.metrics.absences > 3 ? "#ef4444" : "#6b7280"} />
															<MetricBadge
																label="Late Check-ins"
																value={`${reg.lateCount || 0}/${reg.lateThreshold || 15}`}
																color={(reg.lateCount || 0) >= (reg.lateThreshold || 15) ? "#ef4444" : "#f97316"}
															/>
														</div>
													)}

													{reg.isFrequentlyLate && (
														<div className="mt-3 rounded-lg p-3 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "#ef4444" }}>
															<AlertTriangle size={14} />
															<span>
																Frequent late check-ins detected ({reg.lateCount || 0} of {reg.lateThreshold || 15} threshold). This may affect performance cluster level.
															</span>
														</div>
													)}

													{reg.performanceScore !== null && reg.performanceScore !== undefined && <PerformanceScoreBar score={reg.performanceScore} />}

													{/* Organizer Notes (if previously reviewed) */}
													{reg.organizerNotes && (
														<div className="mt-3 rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--page-bg)", borderLeft: "3px solid var(--border-subtle)" }}>
															<p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
																Organizer Notes
															</p>
															<p style={{ color: "var(--text-muted)" }}>{reg.organizerNotes}</p>
															{reg.reviewedAt && (
																<p className="mt-1" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
																	Reviewed: {new Date(reg.reviewedAt).toLocaleString()}
																</p>
															)}
														</div>
													)}

													{/* Actions */}
													{isPending && (
														<div className="mt-4 flex flex-col gap-3">
															{!isReviewing ? (
																<div className="flex gap-3">
																	<button
																		onClick={() => {
																			setReviewingId(reg.id);
																			setReviewAction("accepted");
																			setReviewNotes((prev) => ({ ...prev, [reg.id]: "" }));
																		}}
																		className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-sm transition hover:opacity-90"
																		style={{ backgroundColor: "#10b981", color: "white" }}
																	>
																		<CheckCircle2 size={16} />
																		Accept
																	</button>
																	<button
																		onClick={() => {
																			setReviewingId(reg.id);
																			setReviewAction("declined");
																			setReviewNotes((prev) => ({ ...prev, [reg.id]: "" }));
																		}}
																		className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-sm transition hover:opacity-90"
																		style={{ backgroundColor: "#ef4444", color: "white" }}
																	>
																		<XCircle size={16} />
																		Decline
																	</button>
																</div>
															) : (
																<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--page-bg)" }}>
																	<div className="flex items-center justify-between mb-3">
																		<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
																			{reviewAction === "accepted" ? "Accepting" : "Declining"} {reg.name}'s registration
																		</p>
																		<span
																			className="rounded-full px-2.5 py-1 text-xs font-semibold"
																			style={{
																				backgroundColor: reviewAction === "accepted" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
																				color: reviewAction === "accepted" ? "#10b981" : "#ef4444",
																			}}
																		>
																			{reviewAction === "accepted" ? "Accept" : "Decline"}
																		</span>
																	</div>
																	<div className="mb-3">
																		<label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
																			Organizer Notes (optional)
																		</label>
																		<textarea
																			value={reviewNotes[reg.id] || ""}
																			onChange={(e) => setReviewNotes((prev) => ({ ...prev, [reg.id]: e.target.value }))}
																			rows={3}
																			placeholder="Add notes about this decision..."
																			className="w-full rounded-lg border px-3 py-2 text-sm"
																			style={{
																				backgroundColor: "var(--surface)",
																				borderColor: "var(--border-subtle)",
																				color: "var(--foreground)",
																			}}
																		/>
																	</div>
																	<div className="flex gap-3">
																		<button
																			onClick={() => handleReview(reg.id, reg.participantId)}
																			disabled={actionLoading}
																			className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
																			style={{
																				backgroundColor: reviewAction === "accepted" ? "#10b981" : "#ef4444",
																				color: "white",
																			}}
																		>
																			{actionLoading ? "Saving..." : "Confirm"}
																		</button>
																		<button
																			onClick={() => {
																				setReviewingId(null);
																				setReviewAction(null);
																			}}
																			disabled={actionLoading}
																			className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-sm transition"
																			style={{
																				backgroundColor: "var(--surface-soft)",
																				color: "var(--foreground)",
																				border: "1px solid var(--border-subtle)",
																			}}
																		>
																			Cancel
																		</button>
																	</div>
																</div>
															)}
														</div>
													)}

													{/* Already Reviewed Warning */}
													{isAccepted && (
														<div className="mt-3 rounded-lg p-3 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(16, 185, 129, 0.08)", color: "#10b981" }}>
															<CheckCircle2 size={14} />
															<span>This participant has been accepted for this event.</span>
														</div>
													)}
													{isDeclined && (
														<div className="mt-3 rounded-lg p-3 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "#ef4444" }}>
															<XCircle size={14} />
															<span>This participant has been declined for this event.</span>
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</section>
						)}
					</div>
				</main>
			</div>
		</div>
	);
}
