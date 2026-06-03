"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../../../components/SiteHeader";
import {
	Menu,
	X,
	LogOut,
	ArrowLeft,
	Calendar,
	Clock,
	MapPin,
	Users,
	BarChart3,
	TrendingUp,
	Check,
	CheckCircle,
	XCircle,
	AlertCircle,
	Wifi,
	WifiOff,
	Camera,
	CreditCard,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
		{ label: "Create Event", icon: "📝", href: "/orgDashboard/create-event" },
		{ label: "Active Events", icon: Calendar, href: "#events" },
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
									{Icon ? <Icon size={18} style={{ color: "#3b82f6" }} /> : <span>{item.icon}</span>}
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

export default function EventDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const eventId = params?.id;
	const mode = searchParams?.get("mode") || "check-in"; // check-in or checkout

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [eventData, setEventData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState(mode === "checkout" ? "rfid" : "overview"); // overview, attendance, rfid

	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [cameraReady, setCameraReady] = useState(false);
	const [attendees, setAttendees] = useState([]);
	const [rfidInput, setRfidInput] = useState("");
	const [scanResult, setScanResult] = useState(null);

	useEffect(() => {
		const isLoggedIn = localStorage.getItem("isLoggedIn");
		const userRole = localStorage.getItem("userRole");
		if (!isLoggedIn || userRole !== "organization") {
			router.push("/login");
		} else {
			setIsAuthorized(true);
		}
	}, [router]);

	useEffect(() => {
		if (!isAuthorized || !eventId) return;

		const fetchEventData = async () => {
			try {
				const supabase = createClient();
				const { data: event, error } = await supabase
					.from("events")
					.select("*")
					.eq("event_id", eventId)
					.single();

				if (error) throw error;
				setEventData(event);

				// Fetch attendees
				const { data: attendanceData } = await supabase
					.from("attendance")
					.select("*, participants(*)")
					.eq("event_id", eventId);

				if (attendanceData) {
					setAttendees(attendanceData);
				}
			} catch (error) {
				console.error("Error fetching event:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchEventData();
	}, [isAuthorized, eventId]);

	const handleLogout = () => {
		localStorage.removeItem("isLoggedIn");
		localStorage.removeItem("userRole");
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
			});
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				setCameraReady(true);
			}
		} catch (error) {
			console.error("Camera error:", error);
		}
	};

	const stopCamera = () => {
		if (videoRef.current?.srcObject) {
			videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
		}
		setCameraReady(false);
	};

	const handleRFIDScan = async (e) => {
		if (e.key === "Enter" && rfidInput.trim()) {
			try {
				const supabase = createClient();
				// Find participant by RFID
				const { data: participant } = await supabase
					.from("participants")
					.select("*")
					.eq("rfid_code", rfidInput.trim())
					.single();

				if (participant) {
					if (mode === "checkout") {
						// Update existing attendance with checkout info
						const { data: existingAttendance, error: fetchError } = await supabase
							.from("attendance")
							.select("*")
							.eq("event_id", eventId)
							.eq("participant_id", participant.participant_id)
							.eq("check_out_time", null)
							.single();

						if (existingAttendance) {
							const { error: updateError } = await supabase
								.from("attendance")
								.update({
									check_out_time: new Date().toISOString(),
									check_out_verified: true,
									check_out_method: "rfid",
								})
								.eq("attendance_id", existingAttendance.attendance_id);

							if (!updateError) {
								setScanResult({ success: true, message: `${participant.name} checked out!` });
								setRfidInput("");
								setTimeout(() => setScanResult(null), 3000);
								// Refresh attendees
								const { data: newAttendees } = await supabase
									.from("attendance")
									.select("*, participants(*)")
									.eq("event_id", eventId);
								if (newAttendees) setAttendees(newAttendees);
							} else {
								setScanResult({ success: false, message: "Error recording checkout" });
								setTimeout(() => setScanResult(null), 3000);
							}
						} else {
							setScanResult({ success: false, message: "No active check-in found" });
							setTimeout(() => setScanResult(null), 3000);
						}
					} else {
						// Check-in mode
						// Record attendance
						const { error } = await supabase.from("attendance").insert({
							event_id: eventId,
							participant_id: participant.participant_id,
							check_in_time: new Date().toISOString(),
							verified: true,
							verified_at: new Date().toISOString(),
							verification_method: "rfid",
						});

						if (!error) {
							setScanResult({ success: true, message: `Welcome, ${participant.name}!` });
							setRfidInput("");
							setTimeout(() => setScanResult(null), 3000);
							// Refresh attendees
							const { data: newAttendees } = await supabase
								.from("attendance")
								.select("*, participants(*)")
								.eq("event_id", eventId);
							if (newAttendees) setAttendees(newAttendees);
						}
					}
				} else {
					setScanResult({ success: false, message: "RFID not recognized" });
					setTimeout(() => setScanResult(null), 3000);
				}
			} catch (error) {
				setScanResult({ success: false, message: "Error processing scan" });
				setTimeout(() => setScanResult(null), 3000);
			}
		}
	};

	if (!isAuthorized) return null;
	if (loading) return <div>Loading...</div>;
	if (!eventData) return <div>Event not found</div>;

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
						<div className="flex items-center gap-4">
							<button
								onClick={() => router.back()}
								className="p-2 hover:opacity-70 transition"
								style={{ color: "var(--foreground)" }}
							>
								<ArrowLeft size={20} />
							</button>
						<div>
							<h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
								{eventData.event_name}
							</h1>
							<p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
								{mode === "checkout" ? "Check Out" : "Check In"} Mode
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
						{/* Event Header Info */}
						<section
							className="rounded-lg border p-6"
							style={{
								backgroundColor: "var(--surface)",
								borderColor: "var(--border-subtle)",
							}}
						>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div className="flex items-center gap-3">
									<Calendar size={20} style={{ color: "#3b82f6" }} />
									<div>
										<p className="text-xs text-muted" style={{ color: "var(--text-muted)" }}>
											Date
										</p>
										<p className="font-semibold" style={{ color: "var(--foreground)" }}>
											{new Date(eventData.event_date).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Clock size={20} style={{ color: "#3b82f6" }} />
									<div>
										<p className="text-xs" style={{ color: "var(--text-muted)" }}>
											Time
										</p>
										<p className="font-semibold" style={{ color: "var(--foreground)" }}>
											{eventData.start_time || "TBA"}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<MapPin size={20} style={{ color: "#3b82f6" }} />
									<div>
										<p className="text-xs" style={{ color: "var(--text-muted)" }}>
											Venue
										</p>
										<p className="font-semibold" style={{ color: "var(--foreground)" }}>
											{eventData.venue_name || "TBA"}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Users size={20} style={{ color: "#3b82f6" }} />
									<div>
										<p className="text-xs" style={{ color: "var(--text-muted)" }}>
											Attendees
										</p>
										<p className="font-semibold" style={{ color: "var(--foreground)" }}>
											{attendees.length} / {eventData.expected_attendance}
										</p>
									</div>
								</div>
							</div>
						</section>

						{/* Tabs */}
						<div className="flex gap-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
							{[
								...(mode === "checkout" 
									? [{ id: "rfid", label: "RFID Scanner" }]
									: [
										{ id: "overview", label: "Overview" },
										{ id: "rfid", label: "RFID Scanner" },
										{ id: "face", label: "Face Recognition" },
										{ id: "attendance", label: "Attendees" },
										{ id: "analytics", label: "Analytics" },
									]
								)
							].map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`px-4 py-3 font-medium text-sm transition ${
										activeTab === tab.id ? "border-b-2" : ""
									}`}
									style={{
										color:
											activeTab === tab.id ? "#3b82f6" : "var(--text-muted)",
										borderBottomColor: activeTab === tab.id ? "#3b82f6" : "transparent",
									}}
								>
									{tab.label}
								</button>
							))}
						</div>

						{/* Overview Tab */}
						{activeTab === "overview" && (
							<section
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Event Overview
								</h2>
								<div className="space-y-4">
									<div>
										<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
											Description
										</h3>
										<p style={{ color: "var(--foreground)" }}>
											{eventData.description || "No description provided"}
										</p>
									</div>
									<div>
										<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
											Address
										</h3>
										<p style={{ color: "var(--foreground)" }}>
											{eventData.full_address || "Address not provided"}
										</p>
									</div>
									<div className="grid gap-4 md:grid-cols-3">
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												RFID Enabled
											</h3>
											<span
												className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
												style={{
													backgroundColor: eventData.rfid_enabled
														? "rgba(16, 185, 129, 0.1)"
														: "rgba(107, 114, 128, 0.1)",
													color: eventData.rfid_enabled ? "#10b981" : "#6b7280",
												}}
											>
												{eventData.rfid_enabled ? <Check size={14} /> : <X size={14} />}
												{eventData.rfid_enabled ? "Yes" : "No"}
											</span>
										</div>
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												Face Recognition
											</h3>
											<span
												className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
												style={{
													backgroundColor: eventData.face_recognition_enabled
														? "rgba(16, 185, 129, 0.1)"
														: "rgba(107, 114, 128, 0.1)",
													color: eventData.face_recognition_enabled ? "#10b981" : "#6b7280",
												}}
											>
												{eventData.face_recognition_enabled ? <Check size={14} /> : <X size={14} />}
												{eventData.face_recognition_enabled ? "Yes" : "No"}
											</span>
										</div>
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												Status
											</h3>
											<span
												className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
												style={{
													backgroundColor:
														eventData.is_accepted === true
															? "rgba(16, 185, 129, 0.1)"
															: "rgba(234, 179, 8, 0.1)",
													color:
														eventData.is_accepted === true ? "#10b981" : "#eab308",
												}}
											>
												{eventData.is_accepted === true ? (
													<CheckCircle size={14} />
												) : (
													<AlertCircle size={14} />
												)}
												{eventData.is_accepted === true
													? "Approved"
													: "Pending Approval"}
											</span>
										</div>
									</div>
								</div>
							</section>
						)}

						{/* RFID Scanner Tab */}
						{activeTab === "rfid" && eventData.rfid_enabled && (
							<section
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
									<CreditCard size={20} />
									RFID Card Scanner
								</h2>

								{scanResult && (
									<div
										className="mb-4 p-3 rounded-lg flex items-center gap-2"
										style={{
											backgroundColor: scanResult.success
												? "rgba(16, 185, 129, 0.1)"
												: "rgba(239, 68, 68, 0.1)",
											color: scanResult.success ? "#10b981" : "#ef4444",
										}}
									>
										{scanResult.success ? (
											<CheckCircle size={18} />
										) : (
											<XCircle size={18} />
										)}
										<p>{scanResult.message}</p>
									</div>
								)}

								<div className="space-y-4">
									<p style={{ color: "var(--text-muted)" }}>
										Present RFID card to the reader or tap on the input field and scan
									</p>
									<input
										type="text"
										ref={rfidInput}
										value={rfidInput}
										onChange={(e) => setRfidInput(e.target.value)}
										onKeyPress={handleRFIDScan}
										placeholder="Scan RFID card here..."
										autoFocus
										className="w-full rounded-lg border px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2"
										style={{
											backgroundColor: "var(--page-bg)",
											borderColor: "var(--border-subtle)",
											color: "var(--foreground)",
										}}
									/>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										Press Enter to submit scan
									</p>
								</div>
							</section>
						)}

						{/* Face Recognition Tab */}
						{activeTab === "face" && eventData.face_recognition_enabled && (
							<section
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
									<Camera size={20} />
									Face Recognition Scanner
								</h2>
								<div className="space-y-4">
									<button
										onClick={cameraReady ? stopCamera : startCamera}
										className="w-full rounded-lg px-4 py-3 font-semibold text-sm transition hover:opacity-90"
										style={{
											backgroundColor: cameraReady ? "#ef4444" : "#10b981",
											color: "white",
										}}
									>
										{cameraReady ? "Stop Camera" : "Start Camera"}
									</button>

									{cameraReady && (
										<video
											ref={videoRef}
											autoPlay
											playsInline
											className="w-full rounded-lg"
											style={{ backgroundColor: "#000" }}
										/>
									)}

									<canvas ref={canvasRef} style={{ display: "none" }} />
								</div>
							</section>
						)}

						{/* Attendees Tab */}
						{activeTab === "attendance" && (
							<section
								className="rounded-lg border overflow-hidden"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="p-6 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Attendees ({attendees.length})
								</h2>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr style={{ backgroundColor: "var(--surface-soft)", borderColor: "var(--border-subtle)" }} className="border-b">
												<th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
													Name
												</th>
												<th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
													Email
												</th>
												<th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
													Check-in Time
												</th>
												<th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
													Verification
												</th>
											</tr>
										</thead>
										<tbody>
											{attendees.map((attendee, idx) => (
												<tr
													key={idx}
													style={{
														backgroundColor: "var(--surface)",
														borderColor: "var(--border-subtle)",
													}}
													className={idx !== attendees.length - 1 ? "border-b" : ""}
												>
													<td className="px-6 py-4 font-medium" style={{ color: "var(--foreground)" }}>
														{attendee.participants?.name || "Unknown"}
													</td>
													<td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
														{attendee.participants?.email || "N/A"}
													</td>
													<td className="px-6 py-4" style={{ color: "var(--foreground)" }}>
														{attendee.check_in_time
															? new Date(attendee.check_in_time).toLocaleTimeString()
															: "-"}
													</td>
													<td className="px-6 py-4">
														<span
															className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
															style={{
																backgroundColor: attendee.verified
																	? "rgba(16, 185, 129, 0.1)"
																	: "rgba(239, 68, 68, 0.1)",
																color: attendee.verified ? "#10b981" : "#ef4444",
															}}
														>
															{attendee.verified ? (
																<Check size={12} />
															) : (
																<X size={12} />
															)}
															{attendee.verified ? "Verified" : "Pending"}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>
						)}

						{/* Analytics Tab */}
						{activeTab === "analytics" && (
							<section
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Event Analytics
								</h2>
								<button
									onClick={() => router.push(`/orgDashboard/event/${eventId}/analytics`)}
									className="w-full md:w-auto rounded-lg px-6 py-2 font-semibold text-sm transition hover:opacity-90"
									style={{
										backgroundColor: "#3b82f6",
										color: "white",
									}}
								>
									View Detailed Analytics
								</button>
							</section>
						)}
					</div>
				</main>
			</div>
		</div>
	);
}
