"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";
import BehaviorAnalyticsCard from "../components/BehaviorAnalyticsCard";
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
	TrendingUp,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "#dashboard" },
		{ label: "Performance Analytics", icon: TrendingUp, href: "#behavior" },
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

function EventCard({ event, onViewDetails, isRegistered }) {
	return (
		<div
			className="rounded-lg border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer relative"
			onClick={() => onViewDetails(event)}
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			{isRegistered && (
				<div
					className="absolute top-2 right-2 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
					style={{ backgroundColor: "#10b981", color: "white" }}
					title="You are registered for this event"
				>
					✓
				</div>
			)}

			<div className="mb-3 flex items-start justify-between">
				<h4 className="font-semibold text-sm pr-2" style={{ color: "var(--foreground)" }}>
					{event.event_name}
				</h4>
				<div
					className="rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap"
					style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
				>
					{new Date(event.event_date) > new Date() ? "Upcoming" : "Past"}
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<MapPin size={12} />
					<span>{event.venue_name || "TBA"}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Calendar size={12} />
					<span>{new Date(event.event_date).toLocaleDateString()}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Clock size={12} />
					<span>{event.start_time || "TBA"}</span>
				</div>
				<div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
					<Users size={12} />
					<span>{event.expected_attendance || 0} expected</span>
				</div>
			</div>

			<button
				onClick={(e) => {
					e.stopPropagation();
					onViewDetails(event);
				}}
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
			
			// Try to find or create participant
			const findOrCreateParticipant = async () => {
				try {
					const email = localStorage.getItem("email");
					const firstName = localStorage.getItem("firstName");
					const lastName = localStorage.getItem("lastName");
					
					if (email) {
						const supabase = createClient();
						
						// Try to find existing participant by email
						const { data: participants, error: selectError } = await supabase
							.from("participants")
							.select("participant_id")
							.eq("email", email);
						
						if (participants && participants.length > 0) {
							setParticipantId(participants[0].participant_id);
							console.log("✓ Found participant ID:", participants[0].participant_id);
						} else {
							// Create new participant if not found
							const fullName = firstName && lastName ? `${firstName} ${lastName}` : "User";
							const { data: newParticipant, error: insertError } = await supabase
								.from("participants")
								.insert({
									name: fullName,
									email: email,
									student_id: email, // Use email as student_id
									phone: null,
									rfid: null
								})
								.select("participant_id");
							
							if (newParticipant && newParticipant.length > 0) {
								setParticipantId(newParticipant[0].participant_id);
								console.log("✓ Created new participant ID:", newParticipant[0].participant_id);
							} else if (insertError) {
								console.error("Error creating participant:", insertError.message);
							}
						}
					}
				} catch (error) {
					console.error("Participant lookup error:", error.message);
				}
			};
			
			findOrCreateParticipant();
		}
	}, [router]);

	const handleLogout = () => {
		localStorage.removeItem("isLoggedIn");
		localStorage.removeItem("userRole");
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const [upcomingEvents, setUpcomingEvents] = useState([]);
	const [certificates, setCertificates] = useState([]);
	const [registeredEvents, setRegisteredEvents] = useState([]);
	const [stats, setStats] = useState({ registered: 0, certificates: 0, attendance: 0 });
	const [participantId, setParticipantId] = useState(null);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [isRegistered, setIsRegistered] = useState(false);
	const [registrationReviewStatus, setRegistrationReviewStatus] = useState(null);
	const [isRegistering, setIsRegistering] = useState(false);
	const [showRFIDStep, setShowRFIDStep] = useState(false);
	const [rfidCode, setRfidCode] = useState("");
	const [registeredRFID, setRegisteredRFID] = useState(null);
	const [newRFIDCode, setNewRFIDCode] = useState("");
	const [isSettingRFID, setIsSettingRFID] = useState(false);
	const [rfidMessage, setRfidMessage] = useState("");
	const [registrationMessage, setRegistrationMessage] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [userRegisteredEventIds, setUserRegisteredEventIds] = useState(new Set());
	const [profileData, setProfileData] = useState({
		fullName: "",
		email: "",
		phone: "",
	});
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [profileMessage, setProfileMessage] = useState("");
	const [clusteringInsights, setClusteringInsights] = useState(null);
	const [clusteringLoading, setClusteringLoading] = useState(false);
	const [clusteringError, setClusteringError] = useState(null);

	const handleViewEventDetails = async (event) => {
		setSelectedEvent(event);
		setShowRFIDStep(false);
		setRfidCode("");
		setRegistrationMessage("");
		setRegistrationReviewStatus(null);
		
		// Check if user is registered for this event
		if (participantId) {
			const supabase = createClient();
			const { data: eventParticipants } = await supabase
				.from("event_participants")
				.select("*")
				.eq("event_id", event.event_id)
				.eq("participant_id", participantId);
			
			if (eventParticipants && eventParticipants.length > 0) {
				setIsRegistered(true);
				setRegistrationReviewStatus(eventParticipants[0].review_status || "pending");
			} else {
				setIsRegistered(false);
				setRegistrationReviewStatus(null);
			}
		}
	};

	const handleRegisterEvent = async () => {
		if (!participantId) {
			setRegistrationMessage("Error: Setting up participant profile. Please refresh and try again.");
			console.error("[Register] ParticipantId is null. Email:", localStorage.getItem("email"));
			return;
		}

		setIsRegistering(true);

		try {
			const response = await fetch("/api/register-event", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					eventId: selectedEvent.event_id,
					participantId: participantId,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.ok) {
				throw new Error(result.error || result.details || "Registration failed");
			}

			setIsRegistered(true);
			setShowRFIDStep(true);
			setRegistrationMessage("✓ Event registration submitted! Now register your RFID card.");

			const newRegisteredIds = new Set(userRegisteredEventIds);
			newRegisteredIds.add(selectedEvent.event_id);
			setUserRegisteredEventIds(newRegisteredIds);
		} catch (error) {
			console.error("[Register] Catch error:", error);
			setRegistrationMessage("Error: " + error.message);
		} finally {
			setIsRegistering(false);
		}
	};

	const handleUnregisterEvent = async () => {
		if (!participantId) {
			setRegistrationMessage("Error: Setting up participant profile. Please refresh and try again.");
			return;
		}

		setIsRegistering(true);
		
		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("event_participants")
				.delete()
				.eq("event_id", selectedEvent.event_id)
				.eq("participant_id", participantId);

			if (error) {
				setRegistrationMessage("Error: " + error.message);
			} else {
				setIsRegistered(false);
				setShowRFIDStep(false);
				setRegistrationMessage("✓ You have been unregistered from this event");
				setRegistrationReviewStatus(null);
				
				// Update the registered events list immediately
				const newRegisteredIds = new Set(userRegisteredEventIds);
				newRegisteredIds.delete(selectedEvent.event_id);
				setUserRegisteredEventIds(newRegisteredIds);
				
				setTimeout(() => setSelectedEvent(null), 1500);
			}
		} catch (error) {
			setRegistrationMessage("Error: " + error.message);
		} finally {
			setIsRegistering(false);
		}
	};

	const handleSetRFIDCard = async () => {
		if (!participantId) {
			setRfidMessage("Error: Participant profile not loaded");
			return;
		}

		if (!newRFIDCode.trim()) {
			setRfidMessage("Please enter your RFID code");
			return;
		}

		setIsSettingRFID(true);
		setRfidMessage("");

		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("participants")
				.update({rfid: newRFIDCode })
				.eq("participant_id", participantId);

			if (error) {
				console.error("RFID save error:", error);
				setRfidMessage("Error saving RFID: " + error.message);
			} else {
				setRegisteredRFID(newRFIDCode);
				setNewRFIDCode("");
				setRfidMessage("✓ RFID card registered successfully!");
				setTimeout(() => setRfidMessage(""), 3000);
			}
		} catch (error) {
			console.error("RFID registration error:", error);
			setRfidMessage("Error: " + error.message);
		} finally {
			setIsSettingRFID(false);
		}
	};

	const handleRemoveRFID = async () => {
		if (!participantId) return;

		setIsSettingRFID(true);
		setRfidMessage("");

		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("participants")
				.update({ rfid: null })
				.eq("participant_id", participantId);

			if (error) {
				console.error("RFID remove error:", error);
				setRfidMessage("Error removing RFID: " + error.message);
			} else {
				setRegisteredRFID(null);
				setNewRFIDCode("");
				setRfidMessage("✓ RFID card removed successfully!");
				setTimeout(() => setRfidMessage(""), 3000);
			}
		} catch (error) {
			console.error("RFID remove error:", error);
			setRfidMessage("Error: " + error.message);
		} finally {
			setIsSettingRFID(false);
		}
	};

	const handleRFIDSubmit = async () => {
		if (!participantId) {
			setRegistrationMessage("Error: Participant profile not loaded");
			return;
		}

		if (!rfidCode.trim()) {
			setRegistrationMessage("Please enter your RFID code");
			return;
		}

		setIsRegistering(true);

		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("participants")
				.update({ rfid: rfidCode })
				.eq("participant_id", participantId);

			if (error) {
				console.error("RFID save error:", error);
				setRegistrationMessage("Error saving RFID: " + error.message);
			} else {
				setRegistrationMessage("✓ RFID registered successfully! Event registration complete.");
				setTimeout(() => {
					setSelectedEvent(null);
					setShowRFIDStep(false);
					setRfidCode("");
				}, 2000);
			}
		} catch (error) {
			console.error("Catch error:", error);
			setRegistrationMessage("Error: " + error.message);
		} finally {
			setIsRegistering(false);
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			const userRole = localStorage.getItem("userRole");

			if (userRole === "personal") {
				try {
					const eventsRes = await fetch(`/api/admin/events?action=public-events`);
					const eventsJson = await eventsRes.json();
					const events = eventsJson.data || [];

					if (!eventsRes.ok) {
						console.error("[PersonalDashboard] API error:", eventsJson.error);
					} else if (events) {
						// Set upcoming events directly from database
						setUpcomingEvents(events);
						setRegisteredEvents(events);
						setStats(prev => ({ ...prev, registered: events.length }));

						// Generate certificates based on events
						const certs = events.slice(0, 3).map((e, i) => ({
							id: i + 1,
							title: `${e.event_name} Completion`,
							event: e.event_name,
							date: e.event_date
						}));
						setCertificates(certs);
						setStats(prev => ({ ...prev, certificates: certs.length }));
					}

					const supabase = createClient();
					const { data: attendance } = await supabase
						.from("attendance")
						.select("*");

					if (attendance) {
						const avgAttendance = attendance.length > 0 ? Math.floor((attendance.filter(a => a.verified).length / attendance.length) * 100) : 0;
						setStats(prev => ({ ...prev, attendance: avgAttendance }));
					}
				} catch (error) {
					console.error("[PersonalDashboard] fetchData error:", error);
				}
			}
		};

		if (isAuthorized) {
			fetchData();

			// Set up real-time subscriptions
			const supabase = createClient();
			const subscription = supabase
				.channel("personal-updates")
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
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "event_participants",
					},
					async (payload) => {
						// Refresh user registrations when event_participants changes
						if (participantId) {
							const { data: userRegistrations } = await supabase
								.from("event_participants")
								.select("event_id")
								.eq("participant_id", participantId);
							
							if (userRegistrations) {
								const registeredIds = new Set(userRegistrations.map(r => r.event_id));
								setUserRegisteredEventIds(registeredIds);
								console.log("✓ Updated registrations:", registeredIds);
							}
						}
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

	// Fetch user's registered events when participantId is available
	useEffect(() => {
		if (participantId) {
			const fetchUserRegistrations = async () => {
				try {
					const supabase = createClient();
					const { data: userRegistrations } = await supabase
						.from("event_participants")
						.select("event_id")
						.eq("participant_id", participantId);
					
					if (userRegistrations) {
						const registeredIds = new Set(userRegistrations.map(r => r.event_id));
						setUserRegisteredEventIds(registeredIds);
						console.log("✓ Loaded user registrations:", registeredIds);
					}
				} catch (error) {
					console.error("Error fetching user registrations:", error);
				}
			};
			
			fetchUserRegistrations();
		}
	}, [participantId]);

	useEffect(() => {
		const loadProfileData = async () => {
			try {
				const loginId = localStorage.getItem("loginId");
				const firstName = localStorage.getItem("firstName") || "";
				const lastName = localStorage.getItem("lastName") || "";
				const email = localStorage.getItem("email") || "";

				console.log("Loading profile for loginId:", loginId);

				setProfileData(prev => ({
					...prev,
					fullName: `${firstName} ${lastName}`.trim(),
					email: email,
				}));

				if (!loginId) {
					console.warn("No loginId in localStorage");
					return;
				}

				const supabase = createClient();
				const { data: loginUserArray, error } = await supabase
					.from("login_details")
					.select("phone")
					.eq("login_id", parseInt(loginId, 10));

				console.log("Database query result:", { data: loginUserArray, error });

				if (error) {
					console.error("Error fetching profile:", error);
				} else if (loginUserArray && loginUserArray.length > 0) {
					const loginUser = loginUserArray[0];
					const phoneNum = loginUser.phone ? String(loginUser.phone) : "";
					
					console.log("Setting profile data:", { phoneNum });
					
					setProfileData(prev => ({
						...prev,
						phone: phoneNum,
					}));
					
					const supabaseForRFID = createClient();
					const { data: participantData } = await supabaseForRFID
						.from("participants")
						.select("rfid")
						.eq("email", email)
						.single();
					
					if (participantData?.rfid) {
						setRegisteredRFID(participantData.rfid);
						console.log("Found registered RFID:", participantData.rfid);
					}
				} else {
					console.warn("No data returned from database");
				}
			} catch (error) {
				console.error("Error loading profile data:", error);
			}
		};

		loadProfileData();
	}, []);

	const fetchClusteringInsights = async () => {
		try {
			setClusteringLoading(true);
			setClusteringError(null);
			const params = new URLSearchParams();
			if (participantId) {
				params.set("participantId", participantId);
			}
			const response = await fetch(`/api/clustering?${params.toString()}`);

			if (!response.ok) {
				const result = await response.json().catch(() => ({}));
				throw new Error(result.details || result.error || `Clustering request failed: ${response.statusText}`);
			}

			const data = await response.json();
			setClusteringInsights(data);
		} catch (err) {
			console.error("Error fetching clustering insights:", err);
			setClusteringError(err instanceof Error ? err.message : "Unknown error occurred");
		} finally {
			setClusteringLoading(false);
		}
	};

	useEffect(() => {
		if (participantId && isAuthorized) {
			fetchClusteringInsights();
		}
	}, [participantId, isAuthorized]);

	const handleProfileChange = (e) => {
		const { name, value } = e.target;
		setProfileData(prev => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSaveProfile = async (e) => {
		e.preventDefault();
		setIsSavingProfile(true);
		setProfileMessage("");

		try {
			const loginId = localStorage.getItem("loginId");
			if (!loginId) {
				setProfileMessage("Error: Login session not found. Please log in again.");
				setIsSavingProfile(false);
				return;
			}

			const supabase = createClient();
			
			// Build update object for login_details
			const updateData = {};

			// Handle phone
			const phoneStr = profileData.phone.trim();
			if (phoneStr) {
				const digitsOnly = phoneStr.replace(/\D/g, '');
				if (digitsOnly) {
					updateData.phone = parseInt(digitsOnly, 10);
				} else {
					updateData.phone = null;
				}
			} else {
				updateData.phone = null;
			}

			console.log("Updating login_details with:", updateData);

			const { data, error } = await supabase
				.from("login_details")
				.update(updateData)
				.eq("login_id", loginId);

			console.log("Response data:", data);
			console.log("Response error:", error);

			if (error && error.message) {
				setProfileMessage(`Error saving profile: ${error.message}`);
			} else if (error) {
				setProfileMessage(`Error saving profile`);
			} else {
				setProfileMessage("✓ Profile saved successfully!");
				setTimeout(() => setProfileMessage(""), 3000);
			}
		} catch (error) {
			setProfileMessage(`Error: ${error.message}`);
			console.error("Exception:", error);
		} finally {
			setIsSavingProfile(false);
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
							<StatCard title="Registered Events" value={stats.registered} subtitle="Active" icon={Calendar} />
							<StatCard title="Certificates Earned" value={stats.certificates} subtitle="This month" icon={Award} />
							<StatCard title="Attendance Rate" value={`${stats.attendance}%`} subtitle="Excellent" icon={Users} />
							</div>
						</section>

						{/* Behavior Analytics */}
						<section id="behavior" className="space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
									Performance Group
								</h2>
								<button
									onClick={fetchClusteringInsights}
									disabled={clusteringLoading}
									className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
									style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}
								>
									{clusteringLoading ? "Analyzing..." : "Re-run Analysis"}
								</button>
							</div>
							{clusteringLoading && !clusteringInsights ? (
								<div
									className="rounded-lg border p-8"
									style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
								>
									<div className="text-center">
										<p style={{ color: "var(--text-muted)" }} className="text-sm">
											Running clustering analysis...
										</p>
									</div>
								</div>
							) : clusteringError ? (
								<div
									className="rounded-lg border p-6"
									style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.3)" }}
								>
									<div className="text-center">
										<p style={{ color: "#ef4444" }} className="text-sm">
											{clusteringError}
										</p>
										<button
											onClick={fetchClusteringInsights}
											className="mt-3 rounded-lg px-4 py-2 text-xs font-semibold"
											style={{ backgroundColor: "#ef4444", color: "white" }}
										>
											Try Again
										</button>
									</div>
								</div>
							) : clusteringInsights ? (
								<>
									{/* Summary */}
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
										<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
											<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Analyzed</p>
											<p className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>{clusteringInsights.totalParticipants ?? 0}</p>
										</div>
										<div className="rounded-lg border p-4" style={{ borderColor: "rgba(16, 185, 129, 0.25)" }}>
											<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>High Performers</p>
											<p className="mt-2 text-2xl font-bold" style={{ color: "#10b981" }}>{clusteringInsights.summary?.high_performers ?? 0}</p>
										</div>
										<div className="rounded-lg border p-4" style={{ borderColor: "rgba(234, 179, 8, 0.25)" }}>
											<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Moderate Performers</p>
											<p className="mt-2 text-2xl font-bold" style={{ color: "#eab308" }}>{clusteringInsights.summary?.moderate_performers ?? 0}</p>
										</div>
										<div className="rounded-lg border p-4" style={{ borderColor: "rgba(239, 68, 68, 0.25)" }}>
											<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Low Performers</p>
											<p className="mt-2 text-2xl font-bold" style={{ color: "#ef4444" }}>{clusteringInsights.summary?.low_performers ?? 0}</p>
										</div>
									</div>

									{/* Individual result */}
									{(() => {
										const myCluster = clusteringInsights.clusterAssignment || clusteringInsights.clusters?.find((cluster) => cluster.memberIds?.includes(participantId));
										if (!myCluster) {
											return (
												<div className="rounded-lg border p-6" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}>
													<p className="text-sm" style={{ color: "var(--text-muted)" }}>
														No performance cluster assigned yet. Attend and check in to more events to build your profile.
													</p>
												</div>
											);
										}

										const scoreColor = myCluster.performanceScore >= 70 ? "#10b981" : myCluster.performanceScore >= 40 ? "#eab308" : "#ef4444";

										return (
											<div className="rounded-lg border p-6" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}>
												<div className="flex items-center justify-between mb-4">
													<div>
														<p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Your Cluster</p>
														<h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{myCluster.label}</h3>
													</div>
													<span
														className="rounded-full px-3 py-1 text-xs font-bold"
														style={{ backgroundColor: scoreColor + '20', color: scoreColor }}
													>
														{myCluster.performanceScore}/100
													</span>
												</div>
												<div className="mb-4 h-2 rounded-full" style={{ backgroundColor: "rgba(107, 114, 128, 0.15)" }}>
													<div
														className="h-2 rounded-full"
														style={{ width: `${Math.min(myCluster.performanceScore, 100)}%`, backgroundColor: scoreColor }}
													/>
												</div>
												<div className="grid gap-3 sm:grid-cols-2">
													<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
														<p className="text-xs" style={{ color: "var(--text-muted)" }}>Attendance</p>
														<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{((myCluster.centroid?.attendance_rate ?? 0) * 100).toFixed(0)}%</p>
													</div>
													<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
														<p className="text-xs" style={{ color: "var(--text-muted)" }}>Similarity</p>
														<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{((myCluster.centroid?.avg_similarity ?? 0) * 100).toFixed(0)}%</p>
													</div>
													<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
														<p className="text-xs" style={{ color: "var(--text-muted)" }}>Punctuality</p>
														<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{((myCluster.centroid?.punctuality_score ?? 0) * 100).toFixed(0)}%</p>
													</div>
													<div className="rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
														<p className="text-xs" style={{ color: "var(--text-muted)" }}>Engagement</p>
														<p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{((myCluster.centroid?.engagement_score ?? 0) * 100).toFixed(0)}%</p>
													</div>
												</div>
											</div>
										);
									})()}
								</>
							) : (
								<button
									onClick={fetchClusteringInsights}
									className="w-full rounded-lg border p-6 text-sm font-semibold transition hover:opacity-90"
									style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
								>
									Generate Performance Clusters
								</button>
							)}
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
								{profileMessage && (
									<div
										className="mb-4 rounded-lg p-3 text-sm"
										style={{
											backgroundColor: profileMessage.includes("Error") 
												? "rgba(239, 68, 68, 0.1)" 
												: "rgba(16, 185, 129, 0.1)",
											color: profileMessage.includes("Error") ? "#ef4444" : "#10b981",
											borderLeft: `4px solid ${profileMessage.includes("Error") ? "#ef4444" : "#10b981"}`,
										}}
									>
										{profileMessage}
									</div>
								)}
								<form onSubmit={handleSaveProfile}>
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
												Full Name (from login)
											</label>
											<input
												type="text"
												disabled
												value={profileData.fullName}
												placeholder="Full Name"
												className="w-full rounded-lg border px-3 py-2 text-sm opacity-60"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--text-muted)",
													cursor: "not-allowed",
												}}
											/>
										</div>
										<div>
											<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
												Email (from login)
											</label>
											<input
												type="email"
												disabled
												value={profileData.email}
												placeholder="Email"
												className="w-full rounded-lg border px-3 py-2 text-sm opacity-60"
												style={{
													backgroundColor: "var(--page-bg)",
													borderColor: "var(--border-subtle)",
													color: "var(--text-muted)",
													cursor: "not-allowed",
												}}
											/>
										</div>
										<div>
											<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
												Phone
											</label>
											<input
												type="tel"
												name="phone"
												value={profileData.phone}
												onChange={handleProfileChange}
												placeholder="Enter your phone number"
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
										type="submit"
										disabled={isSavingProfile}
										className="mt-6 w-full rounded-lg px-6 py-2 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
										style={{
											backgroundColor: "#10b981",
											color: "white",
										}}
									>
										{isSavingProfile ? "Saving..." : "Save Profile"}
									</button>
								</form>
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
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full bg-transparent pl-8 text-sm focus:outline-none"
									style={{ color: "var(--foreground)" }}
								/>
							</div>

							{/* Filtered Events */}
							{(() => {
								const filteredEvents = upcomingEvents.filter(event =>
									event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
									(event.venue_name && event.venue_name.toLowerCase().includes(searchQuery.toLowerCase()))
								);

								// Show up to 6 events, or all if searching
								const displayedEvents = searchQuery.length > 0 ? filteredEvents : filteredEvents.slice(0, 6);

								return (
									<>
										<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
											{displayedEvents.length > 0 ? (
												displayedEvents.map((event) => (
													<EventCard
														key={event.event_id}
														event={event}
														onViewDetails={handleViewEventDetails}
														isRegistered={userRegisteredEventIds.has(event.event_id)}
													/>
												))
											) : (
												<div
													className="col-span-full text-center py-8 rounded-lg border"
													style={{
														backgroundColor: "var(--page-bg-soft)",
														borderColor: "var(--border-subtle)",
														color: "var(--text-muted)",
													}}
												>
													<p>{searchQuery.length > 0 ? "No events match your search" : "No events available"}</p>
												</div>
											)}
										</div>

										{searchQuery.length === 0 && filteredEvents.length > 6 && (
											<div className="text-center mt-4">
												<p style={{ color: "var(--text-muted)" }} className="text-sm">
													Showing 6 of {filteredEvents.length} events • Use search to find more
												</p>
											</div>
										)}

										{searchQuery.length > 0 && filteredEvents.length > 0 && (
											<div className="text-center mt-4">
												<p style={{ color: "var(--text-muted)" }} className="text-sm">
													Showing {filteredEvents.length} matching event{filteredEvents.length !== 1 ? "s" : ""}
												</p>
											</div>
										)}
									</>
								);
							})()}

						{/* Event Details Modal */}
						{selectedEvent && (
							<div
								className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
								onClick={() => setSelectedEvent(null)}
								style={{
									backgroundColor: "rgba(0, 0, 0, 0.7)",
								}}
							>
								<div
									className="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
									onClick={(e) => e.stopPropagation()}
									style={{
										backgroundColor: "var(--surface)",
									}}
								>
									{/* Header */}
									<div
										className="p-6 border-b"
										style={{
											backgroundColor: "var(--page-bg-soft)",
											borderColor: "var(--border-subtle)",
										}}
									>
										<div className="flex items-start justify-between">
											<div>
												<h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
													{selectedEvent.event_name}
												</h2>
												<p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
													Event Details & Registration
												</p>
											</div>
											<button
												onClick={() => setSelectedEvent(null)}
												className="p-2 hover:opacity-70 transition"
												style={{ color: "var(--foreground)" }}
											>
												<X size={20} />
											</button>
										</div>
									</div>

									{/* Body */}
									<div className="p-6 space-y-4">
										{/* Event Details */}
										{!showRFIDStep ? (
											<>
												<div className="space-y-3 pb-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
													<div className="flex items-center gap-3">
														<MapPin size={16} style={{ color: "#10b981" }} />
														<div>
															<p className="text-xs" style={{ color: "var(--text-muted)" }}>Location</p>
															<p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																{selectedEvent.venue_name || "TBA"}
															</p>
														</div>
													</div>
													<div className="flex items-center gap-3">
														<Calendar size={16} style={{ color: "#3b82f6" }} />
														<div>
															<p className="text-xs" style={{ color: "var(--text-muted)" }}>Date</p>
															<p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																{new Date(selectedEvent.event_date).toLocaleDateString("en-US", {
																	weekday: "long",
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																})}
															</p>
														</div>
													</div>
													<div className="flex items-center gap-3">
														<Clock size={16} style={{ color: "#f59e0b" }} />
														<div>
															<p className="text-xs" style={{ color: "var(--text-muted)" }}>Time</p>
															<p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																{selectedEvent.start_time || "TBA"} - {selectedEvent.end_time || "TBA"}
															</p>
														</div>
													</div>
													<div className="flex items-center gap-3">
														<Users size={16} style={{ color: "#ec4899" }} />
														<div>
															<p className="text-xs" style={{ color: "var(--text-muted)" }}>Expected Attendance</p>
															<p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																{selectedEvent.expected_attendance || 0} participants
															</p>
														</div>
													</div>
													{selectedEvent.full_address && (
														<div className="flex items-start gap-3">
															<MapPin size={16} style={{ color: "#8b5cf6" }} className="mt-0.5" />
															<div>
																<p className="text-xs" style={{ color: "var(--text-muted)" }}>Full Address</p>
																<p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
																	{selectedEvent.full_address}
																</p>
															</div>
														</div>
													)}
												</div>

												{/* Status Message */}
												{registrationMessage && (
													<div
														className="rounded-lg p-3 text-sm"
														style={{
															backgroundColor: registrationMessage.includes("Error")
																? "rgba(239, 68, 68, 0.1)"
																: "rgba(16, 185, 129, 0.1)",
															color: registrationMessage.includes("Error") ? "#ef4444" : "#10b981",
															borderLeft: `4px solid ${registrationMessage.includes("Error") ? "#ef4444" : "#10b981"}`,
														}}
													>
														{registrationMessage}
													</div>
												)}

											{/* Registration Status */}
											<div
												className="rounded-lg p-3 border"
												style={{
													backgroundColor: isRegistered ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
													borderColor: isRegistered ? "#10b981" : "#3b82f6",
												}}
											>
												<p className="text-sm font-semibold" style={{ color: isRegistered ? "#10b981" : "#3b82f6" }}>
													{isRegistered ? "✓ Registered for this event" : "Not registered for this event"}
												</p>
												{isRegistered && registrationReviewStatus === "pending" && (
													<p className="text-xs mt-1" style={{ color: "#eab308" }}>
														Status: Pending organization review
													</p>
												)}
												{isRegistered && registrationReviewStatus === "accepted" && (
													<p className="text-xs mt-1" style={{ color: "#10b981" }}>
														Status: Accepted by organizer
													</p>
												)}
												{isRegistered && registrationReviewStatus === "declined" && (
													<p className="text-xs mt-1" style={{ color: "#ef4444" }}>
														Status: Declined by organizer
													</p>
												)}
											</div>

												{/* Action Buttons */}
												<div className="flex gap-3 pt-4">
													{isRegistered ? (
														<button
															onClick={handleUnregisterEvent}
															disabled={isRegistering}
															className="flex-1 rounded-lg px-4 py-2 font-semibold text-sm transition disabled:opacity-50"
															style={{
																backgroundColor: "#ef4444",
																color: "white",
															}}
														>
															{isRegistering ? "Processing..." : "Unregister"}
														</button>
													) : (
														<button
															onClick={handleRegisterEvent}
															disabled={isRegistering}
															className="flex-1 rounded-lg px-4 py-2 font-semibold text-sm transition disabled:opacity-50"
															style={{
																backgroundColor: "#10b981",
																color: "white",
															}}
														>
															{isRegistering ? "Registering..." : "Register for Event"}
														</button>
													)}
													<button
														onClick={() => setSelectedEvent(null)}
														className="flex-1 rounded-lg px-4 py-2 font-semibold text-sm transition"
														style={{
															backgroundColor: "rgba(107, 114, 128, 0.1)",
															color: "var(--foreground)",
														}}
													>
														Close
													</button>
												</div>
											</>
										) : (
											/* RFID Registration Step */
											<div className="space-y-4">
												<div className="rounded-lg p-4 text-center" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
													<Smartphone size={32} style={{ color: "#10b981", margin: "0 auto" }} />
													<p className="mt-3 font-semibold text-sm" style={{ color: "var(--foreground)" }}>
														RFID Card Registration
													</p>
													<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
														Tap or enter your RFID card code
													</p>
												</div>

												<div>
													<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
														RFID Code
													</label>
													<input
														type="text"
														value={rfidCode}
														onChange={(e) => setRfidCode(e.target.value)}
														placeholder="Enter RFID code or tap card"
														autoFocus
														className="w-full rounded-lg border px-3 py-2 text-sm"
														style={{
															backgroundColor: "var(--page-bg)",
															borderColor: "var(--border-subtle)",
															color: "var(--foreground)",
														}}
													/>
												</div>

												{registrationMessage && (
													<div
														className="rounded-lg p-3 text-sm"
														style={{
															backgroundColor: registrationMessage.includes("Error")
																? "rgba(239, 68, 68, 0.1)"
																: "rgba(16, 185, 129, 0.1)",
															color: registrationMessage.includes("Error") ? "#ef4444" : "#10b981",
															borderLeft: `4px solid ${registrationMessage.includes("Error") ? "#ef4444" : "#10b981"}`,
														}}
													>
														{registrationMessage}
													</div>
												)}

												<div className="flex gap-3 pt-4">
													<button
														onClick={handleRFIDSubmit}
														disabled={isRegistering}
														className="flex-1 rounded-lg px-4 py-2 font-semibold text-sm transition disabled:opacity-50"
														style={{
															backgroundColor: "#3b82f6",
															color: "white",
														}}
													>
														{isRegistering ? "Saving..." : "Submit RFID"}
													</button>
													<button
														onClick={() => setShowRFIDStep(false)}
														className="flex-1 rounded-lg px-4 py-2 font-semibold text-sm transition"
														style={{
															backgroundColor: "rgba(107, 114, 128, 0.1)",
															color: "var(--foreground)",
														}}
													>
														Back
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
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
  										onClick={() => {
    										// If user has registered events, use the first upcoming one
    										// Or pass all registered event IDs
    										const registeredIds = [...userRegisteredEventIds];
    										const query = registeredIds.length > 0 
      											? `?eventId=${registeredIds[0]}` 
      											: "";
    										router.push(`/personalDashboard/register-face${query}`);
  										}}
  										className="mt-4 w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90"
  										style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
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

									{/* Status Section */}
									{registeredRFID ? (
										<div className="mt-4 rounded-lg border p-3" style={{ 
											backgroundColor: "rgba(16, 185, 129, 0.1)", 
											borderColor: "#10b981" 
										}}>
											<p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#10b981" }}>
												<CheckCircle size={14} /> Registered
											</p>
											<p className="mt-2 text-xs break-all" style={{ color: "var(--text-muted)" }}>
												{registeredRFID}
											</p>
											<button
												onClick={handleRemoveRFID}
												disabled={isSettingRFID}
												className="mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
												style={{
													backgroundColor: "rgba(239, 68, 68, 0.15)",
													color: "#ef4444",
												}}
											>
												{isSettingRFID ? "Removing..." : "Remove Card"}
											</button>
										</div>
									) : (
										<div className="mt-4 space-y-3">
											<div>
												<label className="mb-2 block text-xs font-semibold uppercase" style={{ color: "var(--foreground)" }}>
													RFID Code
												</label>
												<input
													type="text"
													value={newRFIDCode}
													onChange={(e) => setNewRFIDCode(e.target.value)}
													onKeyPress={(e) => {
														if (e.key === "Enter") {
															handleSetRFIDCard();
														}
													}}
													placeholder="Enter RFID code or tap card"
													autoFocus
													className="w-full rounded-lg border px-3 py-2 text-sm"
													style={{
														backgroundColor: "var(--page-bg)",
														borderColor: "var(--border-subtle)",
														color: "var(--foreground)",
													}}
												/>
											</div>

											{rfidMessage && (
												<div
													className="rounded-lg p-2 text-xs"
													style={{
														backgroundColor: rfidMessage.includes("Error") ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
														color: rfidMessage.includes("Error") ? "#ef4444" : "#10b981",
														borderLeft: `3px solid ${rfidMessage.includes("Error") ? "#ef4444" : "#10b981"}`,
													}}
												>
													{rfidMessage}
												</div>
											)}

											<button
												onClick={handleSetRFIDCard}
												disabled={isSettingRFID || !newRFIDCode.trim()}
												className="w-full rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
												style={{
													backgroundColor: "#3b82f6",
													color: "white",
												}}
											>
												{isSettingRFID ? "Saving..." : "Register Card"}
											</button>
										</div>
									)}
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
							{(() => {
								// Show only events the user is registered for
								const userRegisteredEvents = upcomingEvents.filter(event => 
									userRegisteredEventIds.has(event.event_id)
								);

								return (
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
												{userRegisteredEvents.length > 0 ? (
													userRegisteredEvents.map((event, idx) => {
														const eventStatus = new Date(event.event_date) > new Date() ? "Upcoming" : "Completed";
														return (
															<tr
																key={event.event_id}
																style={{
																	backgroundColor: "var(--surface)",
																	borderColor: "var(--border-subtle)",
																}}
																className={idx !== userRegisteredEvents.length - 1 ? "border-b" : ""}
															>
																<td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
																	{event.event_name}
																</td>
																<td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
																	{new Date(event.event_date).toLocaleDateString()}
																</td>
																<td className="px-4 py-3">
																	<span
																		className="rounded-full px-2 py-1 text-xs font-semibold"
																		style={{
																			backgroundColor:
																				eventStatus === "Completed"
																					? "rgba(16, 185, 129, 0.15)"
																					: "rgba(59, 130, 246, 0.15)",
																			color:
																				eventStatus === "Completed"
																					? "#10b981"
																					: "#3b82f6",
																		}}
																	>
																		{eventStatus}
																	</span>
																</td>
															</tr>
														);
													})
												) : (
													<tr>
														<td colSpan="3" className="px-4 py-6 text-center" style={{ color: "var(--text-muted)" }}>
															No registered events yet. Browse events and register to get started!
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								);
							})()}
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}
