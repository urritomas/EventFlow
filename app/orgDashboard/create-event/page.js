"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../../components/SiteHeader";
import dynamic from "next/dynamic";
import {
	Menu,
	X,
	AlertCircle,
	CheckCircle,
	MapPin,
	BarChart3,
} from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
	ssr: false,
});

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
		{ label: "Create Event", icon: BarChart3, href: "/orgDashboard/create-event" },
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
							<X size={16} />
							<span>Logout</span>
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}

export default function CreateEventPage() {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [location, setLocation] = useState({ lat: null, lng: null });
	const [geofenceRadius, setGeofenceRadius] = useState(100);

	const [formData, setFormData] = useState({
		eventName: "",
		eventType: "",
		eventDate: "",
		startTime: "",
		endTime: "",
		venue: "",
		fullAddress: "",
		expectedAttendance: "",
		description: "",
		rfidEnabled: false,
		faceRecognitionEnabled: false,
		geofencingEnabled: false,
		geofenceEarlyMinutes: "",
		geofenceLateMinutes: "",
		geofenceLateCheckinThreshold: "15",
		geofenceReverifyMinutes: "15",
		geofenceEarlyCheckoutMinutes: "",
		geofenceLateCheckoutMinutes: "",
	});

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
		localStorage.removeItem("orgId");
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setIsLoading(true);

		try {
			if (!formData.eventName.trim()) {
				throw new Error("Event name is required");
			}
			if (!formData.eventDate) {
				throw new Error("Event date is required");
			}
			if (!formData.startTime) {
				throw new Error("Start time is required");
			}
			if (!formData.expectedAttendance || parseInt(formData.expectedAttendance) <= 0) {
				throw new Error("Expected attendance must be greater than 0");
			}

			const supabase = createClient();

			const orgLoginId = localStorage.getItem("loginId");
			const orgEmail = localStorage.getItem("email");
			let resolvedOrgLoginId = orgLoginId ? parseInt(orgLoginId, 10) : null;

			if (!resolvedOrgLoginId && orgEmail) {
				const { data: loginRow, error: loginError } = await supabase
					.from("login_details")
					.select("login_id")
					.eq("email_address", orgEmail)
					.eq("login_type", 1)
					.maybeSingle();

				if (!loginError && loginRow?.login_id) {
					resolvedOrgLoginId = loginRow.login_id;
					console.log("Resolved org_login_id from email fallback:", resolvedOrgLoginId);
				} else {
					console.warn("Could not resolve org_login_id. Event will be created without org scoping.");
				}
			}

			const eventPayload = {
				event_name: formData.eventName,
				event_type: formData.eventType || "General",
				event_date: formData.eventDate,
				start_time: formData.startTime,
				end_time: formData.endTime || null,
				venue_name: formData.venue,
				full_address: formData.fullAddress,
				expected_attendance: parseInt(formData.expectedAttendance),
				latitude: location.lat,
				longitude: location.lng,
				geofence_radius: geofenceRadius,
				is_active: true,
				is_accepted: false,
				with_RFID: !!formData.rfidEnabled,
				with_FaceId: !!formData.faceRecognitionEnabled,
				with_Geo: !!formData.geofencingEnabled,
				geofence_early_checkin_allowed: parseInt(formData.geofenceEarlyMinutes || "0", 10) || 0,
				geofence_late_checkin_allowed: parseInt(formData.geofenceLateMinutes || "0", 10) || 0,
				geofence_reverify_minutes: parseInt(formData.geofenceReverifyMinutes || "15", 10) || 15,
				geofence_early_checkout_allowed: parseInt(formData.geofenceEarlyCheckoutMinutes || "0", 10) || 0,
				geofence_late_checkout_allowed: parseInt(formData.geofenceLateCheckoutMinutes || "0", 10) || 0,
				geofence_checkin_window:
					(parseInt(formData.geofenceEarlyMinutes || "0", 10) || 0) + (parseInt(formData.geofenceLateMinutes || "0", 10) || 0),
				geofence_checkout_window:
					(parseInt(formData.geofenceEarlyCheckoutMinutes || "0", 10) || 0) + (parseInt(formData.geofenceLateCheckoutMinutes || "0", 10) || 0),
			};

			if (resolvedOrgLoginId) {
				eventPayload.org_login_id = resolvedOrgLoginId;
			}

			console.log("Creating event with payload:", eventPayload);

			const response = await fetch("/api/admin/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "insert", fields: eventPayload }),
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				throw new Error((result.error?.message || result.error || "Failed to create event. Please check all required fields."));
			}

			const eventData = result.data;

			setSuccessMessage("Event created successfully! Redirecting...");
			setFormData({
				eventName: "",
				eventType: "",
				eventDate: "",
				startTime: "",
				endTime: "",
				venue: "",
				fullAddress: "",
				expectedAttendance: "",
				description: "",
				rfidEnabled: false,
				faceRecognitionEnabled: false,
				geofencingEnabled: false,
				geofenceEarlyMinutes: "",
				geofenceLateMinutes: "",
				geofenceLateCheckinThreshold: "15",
				geofenceReverifyMinutes: "15",
				geofenceEarlyCheckoutMinutes: "",
				geofenceLateCheckoutMinutes: "",
			});
			setLocation({ lat: null, lng: null });

			setTimeout(() => {
				router.push("/orgDashboard");
			}, 1500);
		} catch (error) {
			console.error("Error creating event:", error);
			setErrorMessage(error.message || "Failed to create event. Please try again.");
		} finally {
			setIsLoading(false);
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
							Create New Event
						</h1>
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="rounded-lg p-2 transition hover:opacity-80 md:hidden"
							style={{ backgroundColor: "var(--surface-soft)" }}
						>
							<Menu size={20} style={{ color: "var(--foreground)" }} />
						</button>
					</div>

					<div className="space-y-6 overflow-y-auto p-6 md:p-8">
						{successMessage && (
							<div
								className="rounded-lg p-4 flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]"
								style={{
									backgroundColor: "rgba(16, 185, 129, 0.1)",
									borderLeft: "4px solid #10b981",
								}}
							>
								<CheckCircle size={20} style={{ color: "#10b981" }} />
								<p style={{ color: "#10b981" }}>{successMessage}</p>
							</div>
						)}

						{errorMessage && (
							<div
								className="rounded-lg p-4 flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]"
								style={{
									backgroundColor: "rgba(239, 68, 68, 0.1)",
									borderLeft: "4px solid #ef4444",
								}}
							>
								<AlertCircle size={20} style={{ color: "#ef4444" }} />
								<p style={{ color: "#ef4444" }}>{errorMessage}</p>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-6">
							<section
								className="rounded-lg border p-6 animate-[fadeIn_0.4s_ease-out]"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Basic Information
								</h2>

								<div className="space-y-4">
									<div>
										<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
											Event Name *
										</label>
										<input
											type="text"
											name="eventName"
											value={formData.eventName}
											onChange={handleInputChange}
											placeholder="Enter event name"
											className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
												"--tw-ring-color": "#3b82f6",
											}}
										/>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Event Type
											</label>
											<select
												name="eventType"
												value={formData.eventType}
												onChange={handleInputChange}
												className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--foreground)",
												}}
											>
												<option value="">Select type</option>
												<option value="Conference">Conference</option>
												<option value="Workshop">Workshop</option>
												<option value="Seminar">Seminar</option>
												<option value="Training">Training</option>
												<option value="Meetup">Meetup</option>
												<option value="Other">Other</option>
											</select>
										</div>

										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Expected Attendance *
											</label>
											<input
												type="number"
												name="expectedAttendance"
												value={formData.expectedAttendance}
												onChange={handleInputChange}
												placeholder="e.g., 150"
												min="1"
												className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--foreground)",
												}}
											/>
										</div>
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
											Description
										</label>
										<textarea
											name="description"
											value={formData.description}
											onChange={handleInputChange}
											placeholder="Describe your event..."
											rows="4"
											className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>
								</div>
							</section>

							<section
								className="rounded-lg border p-6 animate-[fadeIn_0.5s_ease-out]"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Date & Time
								</h2>

								<div className="space-y-4">
									<div className="grid gap-4 md:grid-cols-3">
										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Event Date *
											</label>
											<input
												type="date"
												name="eventDate"
												value={formData.eventDate}
												onChange={handleInputChange}
												className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--foreground)",
												}}
											/>
										</div>

										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Start Time *
											</label>
											<input
												type="time"
												name="startTime"
												value={formData.startTime}
												onChange={handleInputChange}
												className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--foreground)",
												}}
											/>
										</div>

										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												End Time
											</label>
											<input
												type="time"
												name="endTime"
												value={formData.endTime}
												onChange={handleInputChange}
												className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--foreground)",
												}}
											/>
										</div>
									</div>
								</div>
							</section>

							<section
								className="rounded-lg border p-6 animate-[fadeIn_0.6s_ease-out]"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Location
								</h2>

								<div className="space-y-4">
									<div>
										<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
											Venue Name
										</label>
										<input
											type="text"
											name="venue"
											value={formData.venue}
											onChange={handleInputChange}
											placeholder="e.g., Grand Ballroom"
											className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
											Full Address
										</label>
										<input
											type="text"
											name="fullAddress"
											value={formData.fullAddress}
											onChange={handleInputChange}
											placeholder="Street, City, State, ZIP"
											className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
									</div>

									<div className="mb-4">
										<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
											Pick Event Location
										</label>
										<LocationPickerMap
											radius={100}
											onLocationSelect={(pos) => {
												setLocation({
													lat: pos.lat,
													lng: pos.lng,
												});
											}}
										/>
										<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
											Click on the map to set the event location
										</p>
									</div>
								</div>
							</section>

							<section
								className="rounded-lg border p-6 animate-[fadeIn_0.7s_ease-out]"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Features
								</h2>

								<div className="space-y-3">
									<label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:opacity-80 transition hover:scale-[1.01]"
										style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
										<input
											type="checkbox"
											name="rfidEnabled"
											checked={formData.rfidEnabled}
											onChange={handleInputChange}
											className="w-4 h-4 rounded"
										/>
										<div>
											<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												RFID Scanning
											</p>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Enable RFID card scanning for attendance
											</p>
										</div>
									</label>

									<label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:opacity-80 transition hover:scale-[1.01]"
										style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
										<input
											type="checkbox"
											name="faceRecognitionEnabled"
											checked={formData.faceRecognitionEnabled}
											onChange={handleInputChange}
											className="w-4 h-4 rounded"
										/>
										<div>
											<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Face Recognition
											</p>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Enable facial recognition for attendance verification
											</p>
										</div>
									</label>

									<label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:opacity-80 transition hover:scale-[1.01]"
										style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
										<input
											type="checkbox"
											name="geofencingEnabled"
											checked={formData.geofencingEnabled}
											onChange={handleInputChange}
											className="w-4 h-4 rounded"
										/>
										<div>
											<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Geofencing
											</p>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Enable location-based check-in restrictions
											</p>
										</div>
									</label>
								</div>
							</section>

							{formData.geofencingEnabled && (
								<section
									className="rounded-lg border p-6 animate-[fadeIn_0.8s_ease-out]"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
									}}
								>
									<h2 className="mb-4 text-lg font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
										<MapPin size={18} />
										Geofence Configuration
									</h2>

									<div className="space-y-4">
										<div className="grid gap-4 md:grid-cols-2">
											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Geofence Radius (meters)
												</label>
												<input
													type="number"
													value={geofenceRadius}
													onChange={(e) => setGeofenceRadius(parseInt(e.target.value) || 100)}
													min="10"
													max="5000"
													step="10"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Participants must be within this distance from the venue to check in
												</p>
											</div>

											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Re-verification Interval (minutes)
												</label>
												<input
													type="number"
													name="geofenceReverifyMinutes"
													value={formData.geofenceReverifyMinutes}
													onChange={handleInputChange}
													min="5"
													max="120"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Require location re-check every N minutes while checked in
												</p>
											</div>
										</div>

										<div className="grid gap-4 md:grid-cols-2">
											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Early Check-in Window (minutes before start)
												</label>
												<input
													type="number"
													name="geofenceEarlyMinutes"
													value={formData.geofenceEarlyMinutes}
													onChange={handleInputChange}
													min="0"
													max="180"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Allow check-in this many minutes before the event starts
												</p>
											</div>

											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Late Check-in Window (minutes after start)
												</label>
												<input
													type="number"
													name="geofenceLateMinutes"
													value={formData.geofenceLateMinutes}
													onChange={handleInputChange}
													min="0"
													max="180"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Allow check-in this many minutes after the event starts
												</p>
											</div>
										</div>

										<div className="grid gap-4 md:grid-cols-2">
											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Late Check-in Threshold (minutes)
												</label>
												<input
													type="number"
													name="geofenceLateCheckinThreshold"
													value={formData.geofenceLateCheckinThreshold}
													onChange={handleInputChange}
													min="0"
													max="180"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Minutes after start before late penalty applies
												</p>
											</div>

											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Early Check-out Window (minutes before end)
												</label>
												<input
													type="number"
													name="geofenceEarlyCheckoutMinutes"
													value={formData.geofenceEarlyCheckoutMinutes}
													onChange={handleInputChange}
													min="0"
													max="180"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Allow check-out this many minutes before the event ends
												</p>
											</div>

											<div>
												<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Late Check-out Window (minutes after end)
												</label>
												<input
													type="number"
													name="geofenceLateCheckoutMinutes"
													value={formData.geofenceLateCheckoutMinutes}
													onChange={handleInputChange}
													min="0"
													max="180"
													step="5"
													className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition hover:border-blue-300"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
												<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
													Allow check-out this many minutes after the event ends
												</p>
											</div>
										</div>

										<div>
											<label className="mb-2 block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
												Geofence Area Preview
											</label>
											<LocationPickerMap
												radius={geofenceRadius}
												initialLocation={location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null}
												readonly={true}
											/>
											<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
												Geofence center uses the venue location set above
											</p>
										</div>
									</div>
								</section>
							)}

							<div className="flex gap-3 animate-[fadeIn_0.9s_ease-out]">
								<button
									type="button"
									onClick={() => router.back()}
									className="flex-1 rounded-lg px-6 py-3 font-semibold text-sm transition hover:opacity-90 hover:scale-[1.01] active:scale-95"
									style={{
										backgroundColor: "var(--surface)",
										borderColor: "var(--border-subtle)",
										border: "1px solid",
										color: "var(--foreground)",
									}}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isLoading}
									className="flex-1 rounded-lg px-6 py-3 font-semibold text-sm transition hover:opacity-90 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
									style={{
										backgroundColor: "#3b82f6",
										color: "white",
									}}
								>
									{isLoading ? "Creating..." : "Create Event"}
								</button>
							</div>
						</form>
					</div>
				</main>
			</div>
		</div>
	);
}
