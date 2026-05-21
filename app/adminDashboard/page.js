"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);

	useEffect(() => {
		const isLoggedIn = localStorage.getItem("isLoggedIn");
		const userRole = localStorage.getItem("userRole");
		if (!isLoggedIn || userRole !== "admin") {
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

	const [eventApprovals, setEventApprovals] = useState([]);
	const [activeEvents, setActiveEvents] = useState([]);
	const [users, setUsers] = useState([]);
	const [applications, setApplications] = useState([]);
	const [stats, setStats] = useState({ totalEvents: 0, pendingApprovals: 0, registeredUsers: 0, activeOrgs: 0 });
	const [currentSection, setCurrentSection] = useState("dashboard");
	const [editingEvent, setEditingEvent] = useState(null);
	const [editMode, setEditMode] = useState("view"); // "view" or "edit"
	const [allEvents, setAllEvents] = useState([]);

	// Create fetchData as a useCallback so it can be called from anywhere
	const fetchData = useCallback(async () => {
		console.log("Fetching data...");
		const supabase = createClient();

		try {
			// Fetch all events
			const { data: events, error: eventsError } = await supabase
				.from("events")
				.select("*")
				.order("event_date", { ascending: false });

			if (eventsError) {
				console.error("Error fetching events:", eventsError);
				return;
			}

			// Store all events for reference
			if (events) {
				console.log("Events fetched:", events.length, events.map(e => ({ id: e.event_id, name: e.event_name, is_active: e.is_active, is_accepted: e.is_accepted })));
				setAllEvents(events);
				setActiveEvents(events.slice(0, 5).map(e => ({
					id: e.event_id,
					name: e.event_name,
					organizer: e.event_type,
					attendees: e.expected_attendance,
					status: e.is_active ? "Active" : "Inactive"
				})));
				
				// Get pending approvals (events not yet accepted)
				const pendingEvents = events.filter(e => !e.is_accepted).map(e => ({
					id: e.event_id,
					name: e.event_name,
					organizer: e.event_type,
					date: e.event_date,
					participants: e.expected_attendance,
					is_accepted: e.is_accepted
				}));
				setEventApprovals(pendingEvents);
				console.log("Pending approvals:", pendingEvents.length);
				
				setStats(prev => ({ 
					...prev, 
					totalEvents: events.length, 
					pendingApprovals: pendingEvents.length 
				}));
			}

			// Fetch all participants (users)
			const { data: participants } = await supabase
				.from("participants")
				.select("*");

			// Fetch login details for admins/organizers
			const { data: loginDetails } = await supabase
				.from("login_details")
				.select("*");

			// Fetch applications/hiring requests
			const { data: apps } = await supabase
				.from("applications")
				.select("*")
				.eq("status", "pending")
				.order("created_at", { ascending: false });

			if (participants && loginDetails) {
				const userList = participants.slice(0, 4).map(p => ({
					id: p.participant_id,
					name: p.name,
					email: p.email,
					type: "Participant",
					status: "Active"
				}));
				setUsers(userList);
				setStats(prev => ({ ...prev, registeredUsers: participants.length, activeOrgs: loginDetails.filter(l => l.login_type === 1).length }));
			}

			if (apps) {
				setApplications(apps);
			}
		} catch (error) {
			console.error("Error in fetchData:", error);
		}
	}, []);

	useEffect(() => {
		if (isAuthorized) {
			// Initial fetch
			fetchData();

			// Set up real-time subscriptions
			const supabase = createClient();
			const subscription = supabase
				.channel("admin-dashboard")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "events",
					},
					() => {
						console.log("Events changed - refreshing");
						fetchData();
					}
				)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "applications",
					},
					() => {
						console.log("Applications changed - refreshing");
						fetchData();
					}
				)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "participants",
					},
					() => {
						console.log("Participants changed - refreshing");
						fetchData();
					}
				)
				.subscribe((status) => {
					console.log("Subscription status:", status);
				});

			// Auto-refresh every 2 seconds as fallback for live updates
			const interval = setInterval(fetchData, 2000);

			return () => {
				subscription.unsubscribe();
				clearInterval(interval);
			};
		}
	}, [isAuthorized, fetchData]);

	// Helper to call server-side admin API and safely parse JSON/text responses
	const callAdminApi = async (body) => {
		const res = await fetch('/api/admin/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		const text = await res.text();
		try {
			return JSON.parse(text);
		} catch (e) {
			return { error: text || e.message, status: res.status };
		}
	};



	const approveEvent = async (id) => {
		console.log("approveEvent called with id:", id);
		try {
			if (!id) {
				alert("Error: Event ID is missing");
				return;
			}

			const json = await callAdminApi({ action: 'update', id, fields: { is_accepted: true } });
			console.log('approveEvent response (admin API):', json);
			if (json.error) {
				console.error('Approval error:', json.error);
				alert(`Error approving event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Event approved, refreshing data");
			alert("Event approved successfully!");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Approval error:", error);
			alert(`Error approving event: ${error.message}`);
		}
	};

	const rejectEvent = async (id) => {
		console.log("rejectEvent called with id:", id);
		try {
			if (!id) {
				alert("Error: Event ID is missing");
				return;
			}

			const json = await callAdminApi({ action: 'update', id, fields: { is_accepted: false } });
			console.log('rejectEvent response (admin API):', json);
			if (json.error) {
				console.error('Rejection error:', json.error);
				alert(`Error rejecting event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Event rejected, refreshing data");
			alert("Event rejected successfully!");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Rejection error:", error);
			alert(`Error rejecting event: ${error.message}`);
		}
	};

	const backToQueue = async (id) => {
		console.log("backToQueue called with id:", id);
		try {
			if (!id) {
				alert("Error: Event ID is missing");
				return;
			}

			const json = await callAdminApi({ action: 'update', id, fields: { is_accepted: false } });
			console.log('backToQueue response (admin API):', json);
			if (json.error) {
				console.error('Error:', json.error);
				alert(`Error sending event back to queue: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Event sent back to queue, refreshing data");
			alert("Event sent back to approval queue!");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Error:", error);
			alert(`Error sending event back to queue: ${error.message}`);
		}
	};

	const toggleEventAcceptance = async (eventId, currentStatus) => {
		try {
			const json = await callAdminApi({ action: 'update', id: eventId, fields: { is_accepted: !currentStatus } });
			console.log('toggleEventAcceptance response (admin API):', json);
			if (json.error) {
				console.error('Error toggling acceptance:', json.error);
				alert(`Error updating event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Toggled acceptance, refreshing data");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Error toggling acceptance:", error);
			alert(`Error updating event: ${error.message}`);
		}
	};

	const toggleEventActive = async (eventId, isCurrentlyActive) => {
		console.log("toggleEventActive called with eventId:", eventId, "isCurrentlyActive:", isCurrentlyActive);
		try {
			if (!eventId) {
				alert("Error: Event ID is missing");
				return;
			}

			const newStatus = !isCurrentlyActive; // Toggle the status
			console.log("Updating is_active to:", newStatus);

			const json = await callAdminApi({ action: 'update', id: eventId, fields: { is_active: newStatus } });
			console.log('toggleEventActive response (admin API):', json);
			if (json.error) {
				console.error('Error toggling active:', json.error);
				alert(`Error updating event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Toggled active status, refreshing data");
			alert("Event status updated successfully!");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Error toggling active:", error);
			alert(`Error updating event: ${error.message}`);
		}
	};

	const approveApplication = async (id) => {
		if (!window.confirm("Are you sure you want to approve this application? An event will be created and the organization will be notified.")) {
			return;
		}

		try {
			const supabase = createClient();
			const app = applications.find(a => a.id === id);
			if (!app) {
				console.error("Application not found");
				return;
			}

			// Create event from approved application
			const { data: eventData, error: eventError } = await supabase
				.from("events")
				.insert([{
					event_name: app.event_name,
					event_type: app.event_type,
					expected_attendance: app.expected_attendance,
					event_date: app.event_date,
					start_time: app.start_time,
					end_time: app.end_time,
					venue_name: app.venue_name,
					full_address: app.full_address,
					is_active: true,
					is_accepted: true,
				}]);

			console.log("approveApplication insert response:", { eventData, eventError });
			if (eventError) {
				console.error("Event creation error:", eventError);
				alert(`Error creating event: ${eventError.message}`);
				return;
			}

			// Update application status
			const { error: updateError } = await supabase
				.from("applications")
				.update({ status: "approved" })
				.eq("id", id);

			if (updateError) {
				console.error("Application update error:", updateError);
				alert(`Error updating application: ${updateError.message}`);
				return;
			}

			alert("Application approved and event created successfully!");
			console.log("Application approved, refreshing data");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Approval error:", error);
			alert(`Error approving application: ${error.message}`);
		}
	};

	const rejectApplication = async (id) => {
		if (!window.confirm("Are you sure you want to reject this application? The organization will be notified.")) {
			return;
		}

		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("applications")
				.update({ status: "rejected" })
				.eq("id", id);

			if (error) {
				console.error("Rejection error:", error);
				alert(`Error rejecting application: ${error.message}`);
				return;
			}

			alert("Application rejected successfully!");
			console.log("Application rejected, refreshing data");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Rejection error:", error);
			alert(`Error rejecting application: ${error.message}`);
		}
	};

	const updateEventStatus = async (eventId, isActive, isAccepted) => {
		console.log("updateEventStatus called with:", { eventId, isActive, isAccepted });
		try {
			if (!eventId) {
				alert("Error: Event ID is missing");
				return;
			}

			const json = await callAdminApi({ action: 'update', id: eventId, fields: { is_active: isActive, is_accepted: isAccepted } });
			console.log('updateEventStatus response (admin API):', json);
			if (json.error) {
				console.error('Event update error:', json.error);
				alert(`Error updating event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log("Event status updated successfully");
			setEditingEvent(null);
			setEditMode("view");
			alert("Event status updated successfully!");
			console.log("Event status updated, refreshing data");
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Event update error:", error);
			alert(`Error updating event: ${error.message}`);
		}
	};

	const deleteEvent = async (eventId) => {
		console.log("deleteEvent called with id:", eventId);
		if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
			return;
		}

		try {
			if (!eventId) {
				alert("Error: Event ID is missing");
				return;
			}

			// Call server-side admin API (service role) to delete the event so RLS doesn't block
			const json = await callAdminApi({ action: 'delete', id: eventId });
			console.log('deleteEvent response (admin API):', json);

			if (json.error) {
				console.error('Event delete error:', json.error);
				alert(`Error deleting event: ${json.error.message || JSON.stringify(json.error)}`);
				return;
			}

			console.log('Event deleted successfully, refreshing data');
			alert('Event deleted successfully!');
			await fetchData(); // Refresh immediately
		} catch (error) {
			console.error("Event delete error:", error);
			alert(`Error deleting event: ${error.message}`);
		}
	};

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
							<StatCard title="Total Events" value={stats.totalEvents} trend="+12 this month" icon={BarChart3} />
							<StatCard title="Pending Approvals" value={stats.pendingApprovals} trend="Needs attention" icon={CheckCircle2} />
							<StatCard title="Registered Users" value={stats.registeredUsers} trend="+45 this week" icon={Users} />
							<StatCard title="Active Organizations" value={stats.activeOrgs} trend="+2 new" icon={TrendingUp} />
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
													<span 
														onClick={() => {
															console.log("Status badge clicked for event:", event.id, "current status:", event.status);
															const isCurrentlyActive = event.status === "Active";
															toggleEventActive(event.id, isCurrentlyActive);
														}}
														className="rounded-full px-2 py-1 text-xs font-semibold cursor-pointer transition hover:opacity-80" 
														style={{ 
															backgroundColor: event.status === "Active" ? "rgba(16, 185, 129, 0.15)" : "rgba(107, 114, 128, 0.15)",
															color: event.status === "Active" ? "#10b981" : "#6b7280"
														}}>
														{event.status}
													</span>
												</td>
												<td className="px-4 py-3 flex gap-2">
													<button 
														onClick={() => {
															console.log("View button clicked for event id:", event.id);
															const evt = allEvents.find(e => e.event_id === event.id);
															console.log("Found event:", evt);
															if (evt) {
																setEditingEvent(evt);
																setEditMode("view");
																console.log("Modal opened in view mode");
															} else {
																alert("Event not found");
															}
														}}
														className="p-1 hover:opacity-70" 
														style={{ color: "#3b82f6" }}
														title="View">
														<Eye size={14} />
													</button>
													<button 
														onClick={() => {
															console.log("Edit button clicked for event id:", event.id);
															const evt = allEvents.find(e => e.event_id === event.id);
															console.log("Found event:", evt);
															if (evt) {
																setEditingEvent(evt);
																setEditMode("edit");
																console.log("Modal opened in edit mode");
															} else {
																alert("Event not found");
															}
														}}
														className="p-1 hover:opacity-70" 
														style={{ color: "#fb923c" }}
														title="Edit">
														<Edit size={14} />
													</button>
													<button 
														onClick={() => {
															console.log("Delete button clicked for event id:", event.id);
															deleteEvent(event.id);
														}}
														className="p-1 hover:opacity-70" 
														style={{ color: "#ef4444" }}
														title="Delete">
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
											<div className="ml-4 flex flex-col gap-2">
												<div className="flex gap-2">
													<button
														onClick={() => {
															console.log("Approve button clicked for event:", event.id);
															approveEvent(event.id);
														}}
														className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
														style={{
															backgroundColor: "rgba(16, 185, 129, 0.15)",
															color: "#10b981",
														}}
													>
														Approve
													</button>
													<button
														onClick={() => {
															console.log("Reject button clicked for event:", event.id);
															rejectEvent(event.id);
														}}
														className="rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
														style={{
															backgroundColor: "rgba(239, 68, 68, 0.15)",
															color: "#ef4444",
														}}
													>
														Reject
													</button>
												</div>
												<button
													onClick={() => {
														console.log("Back to Queue button clicked for event:", event.id);
														backToQueue(event.id);
													}}
													className="rounded-lg px-4 py-2 font-semibold text-xs transition hover:opacity-90 text-center"
													style={{
														backgroundColor: "rgba(168, 85, 247, 0.15)",
														color: "#a855f7",
													}}
												>
													Back to Queue
												</button>
											</div>
										</div>
									</div>
								))}
								{eventApprovals.length === 0 && (
									<p style={{ color: "var(--text-muted)" }} className="text-center py-8">
										No pending approvals
									</p>
								)}
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

						{/* Hiring Applications */}
						{applications.length > 0 && (
							<section className="space-y-4 pb-8">
								<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
									Hiring Applications ({applications.length})
								</h2>
								<div className="space-y-3">
									{applications.map((app) => (
										<div
											key={app.id}
											className="rounded-lg border p-4"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h4 className="font-semibold" style={{ color: "var(--foreground)" }}>
														{app.organization_name}
													</h4>
													<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
														{app.full_name} • {app.email} • {app.phone}
													</p>
													<p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
														Event: <span style={{ color: "var(--foreground)" }}>{app.event_name}</span>
													</p>
													<p className="text-xs" style={{ color: "var(--text-muted)" }}>
														Date: {app.event_date} | Expected: {app.expected_attendance} attendees
													</p>
													<div className="mt-2 flex gap-2">
														{app.services_needed?.rfid && <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-semibold" style={{ color: "#3b82f6" }}>RFID</span>}
														{app.services_needed?.geofencing && <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs font-semibold" style={{ color: "#a855f7" }}>Geofencing</span>}
														{app.services_needed?.facial_recognition && <span className="rounded-full bg-orange-500/20 px-2 py-1 text-xs font-semibold" style={{ color: "#fb923c" }}>Face ID</span>}
													</div>
												</div>
												<div className="flex gap-2">
													<button
														onClick={() => approveApplication(app.id)}
														className="rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90"
														style={{
															backgroundColor: "#10b981",
															color: "white",
														}}
													>
														Approve
													</button>
													<button
														onClick={() => rejectApplication(app.id)}
														className="rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90"
														style={{
															backgroundColor: "#ef4444",
															color: "white",
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
						)}
					</div>
				</main>
			</div>

			{/* Event Edit Modal */}
			{editingEvent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div
						className="rounded-lg border w-full max-w-md mx-4 p-6 space-y-4 max-h-96 overflow-y-auto"
						style={{
							backgroundColor: "var(--surface)",
							borderColor: "var(--border-subtle)",
						}}
					>
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
								{editMode === "view" ? "View Event" : "Edit Event Status"}
							</h3>
							<button
								onClick={() => {
									setEditingEvent(null);
									setEditMode("view");
								}}
								className="p-1 hover:opacity-70"
								style={{ color: "var(--text-muted)" }}
							>
								<X size={16} />
							</button>
						</div>

						<div className="space-y-3">
							<p style={{ color: "var(--text-muted)" }} className="text-sm">
								<span style={{ color: "var(--foreground)" }} className="font-semibold">Event:</span> {editingEvent.event_name}
							</p>

							{editMode === "view" ? (
								// VIEW MODE
								<>
									<div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<p style={{ color: "var(--text-muted)" }}>Organizer</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold">{editingEvent.event_type}</p>
										</div>
										<div>
											<p style={{ color: "var(--text-muted)" }}>Expected Attendees</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold">{editingEvent.expected_attendance}</p>
										</div>
										<div>
											<p style={{ color: "var(--text-muted)" }}>Date</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold">{editingEvent.event_date}</p>
										</div>
										<div>
											<p style={{ color: "var(--text-muted)" }}>Active</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold">{editingEvent.is_active ? "Yes" : "No"}</p>
										</div>
										<div>
											<p style={{ color: "var(--text-muted)" }}>Accepted</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold">{editingEvent.is_accepted ? "Yes" : "No"}</p>
										</div>
										<div>
											<p style={{ color: "var(--text-muted)" }}>Venue</p>
											<p style={{ color: "var(--foreground)" }} className="font-semibold text-xs">{editingEvent.venue_name || "N/A"}</p>
										</div>
									</div>
									<div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
									<button
										onClick={() => setEditMode("edit")}
										className="w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: "#fb923c",
											color: "white",
										}}
									>
										Edit Status
									</button>
									<button
										onClick={() => {
											setEditingEvent(null);
											setEditMode("view");
										}}
										className="w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: "var(--border-subtle)",
											color: "var(--foreground)",
										}}
									>
										Close
									</button>
								</>
							) : (
								// EDIT MODE
								<>
									<div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
									<div className="space-y-2">
										<label style={{ color: "var(--foreground)" }} className="text-sm font-semibold">
											Active Status
										</label>
										<select
											defaultValue={editingEvent.is_active ? "active" : "inactive"}
											onChange={(e) => {
												const isActive = e.target.value === "active";
												updateEventStatus(editingEvent.event_id, isActive, editingEvent.is_accepted);
											}}
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										>
											<option value="active">Active</option>
											<option value="inactive">Inactive</option>
										</select>
									</div>

									<div className="space-y-2">
										<label style={{ color: "var(--foreground)" }} className="text-sm font-semibold">
											Approval Status
										</label>
										<select
											defaultValue={editingEvent.is_accepted ? "accepted" : "pending"}
											onChange={(e) => {
												const isAccepted = e.target.value === "accepted";
												updateEventStatus(editingEvent.event_id, editingEvent.is_active, isAccepted);
											}}
											className="w-full rounded-lg border px-3 py-2 text-sm"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										>
											<option value="accepted">Accepted</option>
											<option value="pending">Pending</option>
										</select>
									</div>

									<button
										onClick={() => {
											setEditingEvent(null);
											setEditMode("view");
										}}
										className="w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: "var(--border-subtle)",
											color: "var(--foreground)",
										}}
									>
										Close
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

