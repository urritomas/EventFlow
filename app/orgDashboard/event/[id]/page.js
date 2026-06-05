"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../../../components/SiteHeader";
import {
	Menu,
	X,
	LogOut,
	LogIn,
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
	Zap,
	ShieldCheck,
	Download,
	Trash2,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
		{ label: "Create Event", icon: Zap, href: "/orgDashboard/create-event" },
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
	const [activeTab, setActiveTab] = useState("unified-scanner");

	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const streamRef = useRef(null);
	const scanTimerRef = useRef(null);
	const resetTimerRef = useRef(null);

	const [cameraReady, setCameraReady] = useState(false);
	const [cameraError, setCameraError] = useState("");
	const [isScanning, setIsScanning] = useState(false);
	const [scanStatus, setScanStatus] = useState("idle"); // idle | scanning | verified | rejected | already_done
	const [scanResult, setScanResult] = useState(null);
	const [checkedInFaceIds, setCheckedInFaceIds] = useState(new Set());
	const [attendees, setAttendees] = useState([]);
	const [registeredParticipants, setRegisteredParticipants] = useState([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const rfidInput = useRef(null);

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

				// Fetch attendees with check-in and check-out times
				const { data: attendanceData } = await supabase
					.from("attendance")
					.select("*, participants(id, name, email)")
					.eq("event_id", eventId)
					.order("check_in_time", { ascending: false });

				if (attendanceData) {
					setAttendees(attendanceData);
				}

				// Fetch registered participants from event_participants joined with participants
				const { data: participantsData } = await supabase
					.from("event_participants")
					.select("*, participants(participant_id, name, email)")
					.eq("event_id", eventId);

				if (participantsData) {
					setRegisteredParticipants(participantsData);
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

	const handleDeleteEvent = async () => {
		if (!eventData) return;

		setIsDeleting(true);
		try {
			// Call API route with service role to bypass RLS
			const response = await fetch("/api/admin/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "delete", id: eventId }),
			});

			const result = await response.json();

			if (!response.ok) {
				alert("Failed to delete event: " + (result.error?.message || "Unknown error"));
			} else {
				router.push("/orgDashboard");
			}
		} catch (error) {
			console.error("Delete error:", error);
			alert("Exception while deleting: " + error.message);
		} finally {
			setIsDeleting(false);
			setShowDeleteModal(false);
		}
	};

	// Auto-start camera when unified-scanner tab opens
	useEffect(() => {
		if (activeTab !== "unified-scanner" || !eventData?.with_FaceId) return;

		const startCameraForScanning = async () => {
			try {
				setCameraError("");
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
				});
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					setTimeout(() => {
						setCameraReady(true);
						setIsScanning(true); // Auto-start scanning
					}, 500);
				}
			} catch (error) {
				setCameraError("Cannot access camera. Check permissions and try again.");
				console.error("Camera error:", error);
			}
		};

		startCameraForScanning();

		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}
			if (scanTimerRef.current) clearInterval(scanTimerRef.current);
			if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
			setCameraReady(false);
			setIsScanning(false);
		};
	}, [activeTab, eventData?.with_FaceId]);

	// Continuous face scanning loop
	const captureAndVerifyFace = async (alreadyCheckedInIds) => {
		if (!videoRef.current || !canvasRef.current) return;

		const video = videoRef.current;
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

		setScanStatus("scanning");

		try {
			const res = await fetch("/api/verify-face", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image: imageDataUrl }),
			});
			const data = await res.json();

			if (!res.ok || (!data.verified && data.similarity === 0)) {
				setScanStatus("idle");
				return;
			}

			setScanResult(data);

			if (data.verified) {
				const participantId = data.participant_id || data.student_id;

				if (alreadyCheckedInIds.has(participantId)) {
					setScanStatus("already_done");
				} else {
					setScanStatus("verified");
					setCheckedInFaceIds((prev) => new Set([...prev, participantId]));

					// Record check-in to database
					const supabase = createClient();
					const { error } = await supabase.from("attendance").insert({
						event_id: eventId,
						participant_id: participantId,
						check_in_time: new Date().toISOString(),
						verified: true,
						verification_method: "face",
					});

					if (!error) {
						// Refresh attendees list
						const { data: newAttendees } = await supabase
							.from("attendance")
							.select("*, participants(id, name, email)")
							.eq("event_id", eventId)
							.order("check_in_time", { ascending: false });

						if (newAttendees) setAttendees(newAttendees);
					}
				}
			} else {
				setScanStatus("rejected");
			}

			// Auto-reset after showing result
			resetTimerRef.current = setTimeout(() => {
				setScanStatus("idle");
				setScanResult(null);
			}, 2500);
		} catch (error) {
			console.error("Verification error:", error);
			setScanStatus("idle");
		}
	};

	const checkedInRef = useRef(checkedInFaceIds);
	useEffect(() => {
		checkedInRef.current = checkedInFaceIds;
	}, [checkedInFaceIds]);

	useEffect(() => {
		if (!cameraReady || !isScanning || scanStatus !== "idle") return;

		scanTimerRef.current = setInterval(() => {
			captureAndVerifyFace(checkedInRef.current);
		}, 2000);

		return () => {
			if (scanTimerRef.current) clearInterval(scanTimerRef.current);
		};
	}, [cameraReady, isScanning, scanStatus]);

	// Legacy: Manual start/stop camera (keeping for backward compatibility)
	const stopCamera = () => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
		}
		setCameraReady(false);
		setIsScanning(false);
		setScanStatus("idle");
	};

	const handleRFIDScan = async (e) => {
		const value = rfidInput.current?.value?.trim();
		if (e.key === "Enter" && value) {
			try {
				const supabase = createClient();
				const { data: registration } = await supabase
					.from("event_participants")
					.select("*, participants(*)")
					.eq("reg_rfid", value)
					.eq("event_id", eventId)
					.single();

				const participant = registration?.participants || null;

				if (participant) {
					if (mode === "checkout") {
						const { data: existingAttendance } = await supabase
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
								if (rfidInput.current) rfidInput.current.value = "";
								setTimeout(() => setScanResult(null), 3000);
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
						const { error } = await supabase.from("attendance").insert({
							event_id: eventId,
							participant_id: participant.participant_id,
							check_in_time: new Date().toISOString(),
							verified: false,
							verification_method: "rfid",
							source_rfid: value,
						});

						if (!error) {
							setScanResult({ success: true, message: `RFID recognized — ${participant.name} marked Partially Checked In` });
							if (rfidInput.current) rfidInput.current.value = "";
							setTimeout(() => setScanResult(null), 3000);
							const { data: newAttendees } = await supabase
								.from("attendance")
								.select("*, participants(*)")
								.eq("event_id", eventId);
							if (newAttendees) setAttendees(newAttendees);
						}
					}
				} else {
					setScanResult({ success: false, message: "RFID not recognized for this event" });
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
						<button
							onClick={() => setShowDeleteModal(true)}
							className="flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
							style={{
								backgroundColor: "rgba(239, 68, 68, 0.1)",
								color: "#ef4444",
								border: "1px solid rgba(239, 68, 68, 0.3)",
							}}
						>
							<Trash2 size={16} />
							Delete Event
						</button>
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
											Registered
										</p>
										<button
											onClick={() => setActiveTab("registered")}
											className="font-semibold hover:underline transition"
											style={{ color: "var(--foreground)" }}
										>
											{registeredParticipants.length} / {eventData.expected_attendance}
										</button>
									</div>
								</div>
							</div>
						</section>

						{/* Tabs */}
					<div className="flex gap-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
						{[
							{ id: "overview", label: "Overview", icon: Calendar },
							{ id: "unified-scanner", label: "Quick Scan", icon: Zap },
							{ id: "registered", label: "Registered", icon: Users },
							{ id: "attendance", label: "Attendees", icon: CheckCircle },
							{ id: "analytics", label: "Analytics", icon: TrendingUp },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`px-4 py-3 font-medium text-sm transition flex items-center gap-2 ${
									activeTab === tab.id ? "border-b-2" : ""
								}`}
								style={{
									color: activeTab === tab.id ? "#3b82f6" : "var(--text-muted)",
									borderBottomColor: activeTab === tab.id ? "#3b82f6" : "transparent",
								}}
							>
								<tab.icon size={16} />
								{tab.label}
								{tab.id === "unified-scanner" && (
									<span
										className="rounded-full px-2 py-0.5 text-xs font-bold"
										style={{
											backgroundColor: "rgba(59, 130, 246, 0.15)",
											color: "#3b82f6",
										}}
									>
										FAST
									</span>
								)}
							</button>
						))}
					</div>

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
													backgroundColor: eventData.with_RFID
														? "rgba(16, 185, 129, 0.1)"
														: "rgba(107, 114, 128, 0.1)",
													color: eventData.with_RFID ? "#10b981" : "#6b7280",
												}}
											>
												{eventData.with_RFID ? <Check size={14} /> : <X size={14} />}
												{eventData.with_RFID ? "Yes" : "No"}
											</span>
										</div>
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												Geofencing
											</h3>
											<span
												className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
												style={{
													backgroundColor: eventData.with_Geo
														? "rgba(16, 185, 129, 0.1)"
														: "rgba(107, 114, 128, 0.1)",
													color: eventData.with_Geo ? "#10b981" : "#6b7280",
												}}
											>
												{eventData.with_Geo ? <Check size={14} /> : <X size={14} />}
												{eventData.with_Geo ? "Yes" : "No"}
											</span>
										</div>
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												Face Recognition
											</h3>
											<span
												className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
												style={{
													backgroundColor: eventData.with_FaceId
														? "rgba(16, 185, 129, 0.1)"
														: "rgba(107, 114, 128, 0.1)",
													color: eventData.with_FaceId ? "#10b981" : "#6b7280",
												}}
											>
												{eventData.with_FaceId ? <Check size={14} /> : <X size={14} />}
												{eventData.with_FaceId ? "Yes" : "No"}
											</span>
										</div>
										<div>
											<h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
												Status
											</h3>
											<span
												className="rounded-full px-3 py-1 text-sm font-semibold"
												style={{
													backgroundColor: eventData.is_accepted
														? "rgba(16, 185, 129, 0.1)"
														: eventData.is_active
														? "rgba(59, 130, 246, 0.15)"
														: "rgba(107, 114, 128, 0.15)",
													color: eventData.is_accepted
														? "#10b981"
														: eventData.is_active
														? "#3b82f6"
														: "#6b7280",
												}}
											>
												{eventData.is_accepted ? "Approved" : eventData.is_active ? "Active" : "Pending"}
											</span>
										</div>
									</div>

									{/* Quick Actions */}
									<div className="grid gap-4 md:grid-cols-3">
										<button
											onClick={() => router.push(`/orgDashboard/event/${eventId}`)}
											className="rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:border-blue-200"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="flex items-center gap-2 mb-2">
												<LogIn size={18} style={{ color: "#10b981" }} />
												<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
													Check In / Out
												</h3>
											</div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Manage attendance via scanner or manual entry
											</p>
										</button>

										<button
											onClick={() => router.push(`/orgDashboard/attendance-scanner`)}
											className="rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:border-blue-200"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="flex items-center gap-2 mb-2">
												<Camera size={18} style={{ color: "#3b82f6" }} />
												<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
													Live Scanner
												</h3>
											</div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Use face recognize and RFID in one scan view
											</p>
										</button>

										<button
											onClick={() => setActiveTab("analytics")}
											className="rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:border-blue-200"
											style={{
												backgroundColor: "var(--surface)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="flex items-center gap-2 mb-2">
												<TrendingUp size={18} style={{ color: "#f59e0b" }} />
												<h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
													Analytics
												</h3>
											</div>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												View attendance performance
											</p>
										</button>
									</div>
								</div>
							</section>
						)}

						{/* Quick Scan Tab */}
						{activeTab === "unified-scanner" && (eventData.with_FaceId || eventData.with_RFID) && (
							<section
								className="rounded-lg border p-6"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
										<ShieldCheck size={20} />
										Quick Attendance Scan
									</h2>
									{eventData.with_Geo && (
										<span
											className="rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5"
											style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
										>
											<MapPin size={12} /> Geofencing Active
										</span>
									)}
								</div>

								<p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
									Face recognition runs automatically. Use RFID as quick fallback.
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									{/* Face Recognition Panel */}
									{eventData.with_FaceId && (
										<div
											className="rounded-xl border p-4"
											style={{ borderColor: "rgba(59, 130, 246, 0.3)" }}
										>
											<div className="flex items-center gap-2 mb-3">
												<Camera size={18} style={{ color: "#3b82f6" }} />
												<h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													Face Recognition
												</h3>
												<span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
													AUTO
												</span>
											</div>

											{cameraError ? (
												<div className="flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 p-4 mb-3" style={{ aspectRatio: "4/3" }}>
													<div className="text-center">
														<XCircle size={32} style={{ color: "#ef4444", margin: "0 auto" }} />
														<p className="text-xs text-red-400 mt-2">{cameraError}</p>
													</div>
												</div>
											) : (
												<div className={`relative rounded-lg mb-3 border-2 transition-all ${
													scanStatus === "scanning" ? "border-yellow-400" :
													scanStatus === "verified" ? "border-emerald-400" :
													scanStatus === "rejected" ? "border-red-400" :
													"border-blue-400/50"
												}`} style={{ aspectRatio: "4/3" }}>
													<video
														ref={videoRef}
														autoPlay
														playsInline
														muted
														className="w-full h-full rounded-lg object-cover"
														style={{ backgroundColor: "#000" }}
													/>
													<canvas ref={canvasRef} style={{ display: "none" }} />

													{/* Status overlay */}
													<div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 flex items-center justify-center gap-2">
														{scanStatus === "scanning" && <div className="h-2.5 w-2.5 animate-ping rounded-full bg-yellow-400" />}
														{scanStatus === "verified" && <CheckCircle size={14} style={{ color: "#10b981" }} />}
														{scanStatus === "rejected" && <XCircle size={14} style={{ color: "#ef4444" }} />}
														<span className="text-xs font-semibold" style={{
															color: scanStatus === "scanning" ? "#fbbf24" :
																	scanStatus === "verified" ? "#10b981" :
																	scanStatus === "rejected" ? "#ef4444" :
																	"#9ca3af"
														}}>
															{scanStatus === "idle" ? "Ready" :
																scanStatus === "scanning" ? "Analyzing..." :
																scanStatus === "verified" ? "Face Matched" :
																scanStatus === "rejected" ? "Not Recognized" :
																""}
														</span>
													</div>

													{/* Camera startup overlay */}
													{!cameraReady && (
														<div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
															<p className="text-sm text-slate-400">Initializing camera...</p>
														</div>
													)}
												</div>
											)}

											{/* Result card */}
											{scanResult && scanStatus !== "idle" && scanStatus !== "scanning" && (
												<div className={`rounded-lg p-3 mb-3 text-xs ${
													scanStatus === "verified"
														? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
														: scanStatus === "already_done"
														? "bg-slate-500/10 border border-slate-500/30 text-slate-300"
														: "bg-red-500/10 border border-red-500/30 text-red-300"
												}`}>
													{scanStatus === "verified" && (
														<div className="flex items-center gap-2">
															<CheckCircle size={14} />
															<span>✓ {scanResult.name} checked in</span>
														</div>
													)}
													{scanStatus === "already_done" && (
														<div className="flex items-center gap-2">
															<CheckCircle size={14} />
															<span>{scanResult.name} already checked in</span>
														</div>
													)}
													{scanStatus === "rejected" && (
														<div className="flex items-center gap-2">
															<XCircle size={14} />
															<span>Face not recognized (${(scanResult.similarity * 100).toFixed(0)}%)</span>
														</div>
													)}
												</div>
											)}

											<div className="flex items-center justify-between text-xs">
												<span style={{ color: cameraReady ? "#10b981" : "var(--text-muted)" }}>
													{cameraReady ? "Camera active • Auto-scanning" : "Starting camera..."}
												</span>
												{cameraReady && (
													<button
														onClick={stopCamera}
														className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
														style={{
															backgroundColor: "rgba(239, 68, 68, 0.15)",
															color: "#ef4444",
														}}
													>
														Stop
													</button>
												)}
											</div>
										</div>
									)}

									{/* RFID Scanner Panel */}
									{eventData.with_RFID && (
										<div
											className="rounded-xl border p-4"
											style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}
										>
											<div className="flex items-center gap-2 mb-3">
												<CreditCard size={18} style={{ color: "#10b981" }} />
												<h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
													RFID Scanner
												</h3>
												<span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
													FALLBACK
												</span>
											</div>
											{scanResult && (
												<div
													className="mb-3 p-2.5 rounded-lg flex items-center gap-2 text-xs"
													style={{
														backgroundColor: scanResult.success
															? "rgba(16, 185, 129, 0.1)"
															: "rgba(239, 68, 68, 0.1)",
														color: scanResult.success ? "#10b981" : "#ef4444",
													}}
												>
													{scanResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
													<p>{scanResult.message}</p>
												</div>
											)}
										<input
											type="text"
											ref={rfidInput}
											onKeyPress={handleRFIDScan}
											placeholder="Scan RFID card here or type..."
											autoFocus={!eventData.with_FaceId}
											className="w-full rounded-lg border px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 mb-2"
											style={{
												backgroundColor: "var(--page-bg)",
												borderColor: "var(--border-subtle)",
												color: "var(--foreground)",
											}}
										/>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Press Enter when scanned
											</p>
										</div>
									)}
								</div>

								{!eventData.with_FaceId && !eventData.with_RFID && (
									<div className="text-center py-8">
										<p style={{ color: "var(--text-muted)" }}>
											No scanning methods enabled for this event.
										</p>
									</div>
								)}
							</section>
						)}

						{/* Registered Tab */}
						{activeTab === "registered" && (
							<section
								className="rounded-lg border overflow-hidden"
								style={{
									backgroundColor: "var(--surface)",
									borderColor: "var(--border-subtle)",
								}}
							>
								<div className="p-6 flex items-center justify-between border-b" style={{ borderColor: "var(--border-subtle)" }}>
									<h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
										Registered Participants ({registeredParticipants.length})
									</h2>
									<button
										onClick={() => {
											const headers = ["Name", "Email", "Status"];
											const rows = registeredParticipants.map((p) => [
												p.participants?.name || "Unknown",
												p.participants?.email || "N/A",
												"Registered",
											]);
											const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
											const blob = new Blob([csvContent], { type: "text/csv" });
											const url = window.URL.createObjectURL(blob);
											const link = document.createElement("a");
											link.href = url;
											link.download = `${eventData?.event_name || "event"}_registered_${Date.now()}.csv`;
											link.click();
											window.URL.revokeObjectURL(url);
										}}
										className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
										style={{ backgroundColor: "#3b82f6" }}
									>
										<Download size={16} />
										Download CSV
									</button>
								</div>
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
													Status
												</th>
											</tr>
										</thead>
										<tbody>
											{registeredParticipants.map((participant, idx) => (
												<tr
													key={participant.id || idx}
													style={{
														backgroundColor: "var(--surface)",
														borderColor: "var(--border-subtle)",
													}}
													className={idx !== registeredParticipants.length - 1 ? "border-b" : ""}
												>
													<td className="px-6 py-4 font-medium" style={{ color: "var(--foreground)" }}>
														{participant.participants?.name || "Unknown"}
													</td>
													<td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
														{participant.participants?.email || "N/A"}
													</td>
													<td className="px-6 py-4">
														<span
															className="rounded-full px-2.5 py-1 text-xs font-semibold"
															style={{
																backgroundColor: "rgba(16, 185, 129, 0.15)",
																color: "#10b981",
															}}
														>
															Registered
														</span>
													</td>
												</tr>
											))}
											{registeredParticipants.length === 0 && (
												<tr>
													<td
														className="px-6 py-6 text-center text-sm"
														style={{ color: "var(--text-muted)" }}
														colSpan={3}
													>
														No registered participants found.
													</td>
												</tr>
											)}
										</tbody>
									</table>
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
													Check-out Time
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
													<td className="px-6 py-4" style={{ color: "var(--foreground)" }}>
														{attendee.check_out_time
															? new Date(attendee.check_out_time).toLocaleTimeString()
															: "-"}
													</td>
												</tr>
											))}
											{attendees.length === 0 && (
												<tr>
													<td
														className="px-6 py-6 text-center text-sm"
														style={{ color: "var(--text-muted)" }}
														colSpan={4}
													>
														No attendees recorded yet.
													</td>
												</tr>
											)}
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
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
										Attendance Analytics
									</h2>
									<button
										onClick={() => {
											const headers = ["Name", "Email", "Check-in Time", "Check-out Time", "Status"];
											const rows = attendees.map((a) => [
												a.participants?.name || "Unknown",
												a.participants?.email || "N/A",
												a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : "-",
												a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString() : "-",
												a.check_out_time ? "Checked Out" : a.check_in_time ? "Checked In" : "Not Checked In",
											]);
											const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
											const blob = new Blob([csvContent], { type: "text/csv" });
											const url = window.URL.createObjectURL(blob);
											const link = document.createElement("a");
											link.href = url;
											link.download = `${eventData?.event_name || "event"}_attendance_${Date.now()}.csv`;
											link.click();
											window.URL.revokeObjectURL(url);
										}}
										className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
										style={{ backgroundColor: "#3b82f6" }}
									>
										<Download size={16} />
										Download CSV
									</button>
								</div>

								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
									<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
										<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Checked In</p>
										<p className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>{attendees.filter((a) => a.check_in_time).length}</p>
									</div>
									<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
										<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Checked Out</p>
										<p className="mt-2 text-2xl font-bold" style={{ color: "#10b981" }}>
											{attendees.filter((a) => a.check_out_time).length}
										</p>
									</div>
									<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
										<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Pending Checkout</p>
										<p className="mt-2 text-2xl font-bold" style={{ color: "#f97316" }}>
											{attendees.filter((a) => a.check_in_time && !a.check_out_time).length}
										</p>
									</div>
									<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
										<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Attendance Rate</p>
										<p className="mt-2 text-2xl font-bold" style={{ color: "#3b82f6" }}>
											{eventData?.expected_attendance
												? Math.round((attendees.filter((a) => a.check_in_time).length / eventData.expected_attendance) * 100)
												: 0}
											%
										</p>
									</div>
								</div>
							</section>
						)}

						{/* Delete Confirmation Modal */}
						{showDeleteModal && eventData && (
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
										Are you sure you want to delete <strong style={{ color: "var(--foreground)" }}>{eventData.event_name}</strong>? This action cannot be undone. All associated data including registrations and attendance records will be permanently removed.
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
				</main>
			</div>
		</div>
	);
}
