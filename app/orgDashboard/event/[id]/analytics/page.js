"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../../../../components/SiteHeader";
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
	TrendingDown,
	Check,
	AlertCircle,
	CheckCircle,
	XCircle,
	Download,
	Zap,
} from "lucide-react";

function Sidebar({ isOpen, onClose, onLogout }) {
	const menuItems = [
		{ label: "Dashboard", icon: BarChart3, href: "/orgDashboard" },
		{ label: "Create Event", icon: Zap, href: "/orgDashboard/create-event" },
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

function StatCard({ title, value, icon: Icon, trend, color = "#3b82f6" }) {
	return (
		<div
			className="rounded-lg border p-5 shadow-sm"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			<div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
				<Icon size={18} style={{ color }} />
			</div>
			<div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
				{title}
			</div>
			<div className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
				{value}
			</div>
			{trend && (
				<div className="mt-2 flex items-center gap-1 text-xs" style={{ color: trend.positive ? "#10b981" : "#ef4444" }}>
					{trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
					<span>{trend.text}</span>
				</div>
			)}
		</div>
	);
}

export default function EventAnalyticsPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params?.id;

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [eventData, setEventData] = useState(null);
	const [attendanceData, setAttendanceData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		totalRegistered: 0,
		totalAttended: 0,
		attendanceRate: 0,
		lateArrivals: 0,
		verifiedParticipants: 0,
		avgCheckInTime: 0,
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

	useEffect(() => {
		if (!isAuthorized || !eventId) return;

		const fetchAnalyticsData = async () => {
			try {
				const supabase = createClient();

				const { data: event, error: eventError } = await supabase
					.from("events")
					.select("*")
					.eq("event_id", eventId)
					.single();

				if (eventError || !event) {
					console.error("Event not found:", eventError);
					setEventData(null);
					setLoading(false);
					return;
				}

				setEventData(event);

			const { data: attendance, error: attendanceError } = await supabase
				.from("attendance_logs")
				.select("*, participants(*)")
				.eq("event_id", eventId);

			if (attendanceError) {
				console.error("Attendance fetch error:", attendanceError);
				setAttendanceData([]);
				setStats((prev) => ({
					...prev,
					totalRegistered: event?.expected_attendance || 0,
				}));
				setLoading(false);
				return;
			}

			if (!attendance || attendance.length === 0) {
				setAttendanceData([]);
				setStats({
					totalRegistered: event?.expected_attendance || 0,
					totalAttended: 0,
					attendanceRate: 0,
					lateArrivals: 0,
					verifiedParticipants: 0,
					avgCheckInTime: 0,
				});
				return;
			}

			setAttendanceData(attendance);

			// Calculate stats
			const totalAttended = attendance.filter((a) => a.verified).length;
			const lateArrivals = attendance.filter((a) => {
				if (!a.verified_at || !a.check_in_time) return false;
				const verifiedTime = new Date(a.verified_at).getTime();
				const checkInTime = new Date(a.check_in_time).getTime();
				return verifiedTime - checkInTime > 15 * 60 * 1000;
			}).length;

			const verifiedCount = attendance.filter((a) => a.verified).length;

			let totalCheckInTime = 0;
			let checkInCount = 0;
			attendance.forEach((a) => {
				if (a.verified_at && a.check_in_time) {
					const verifiedTime = new Date(a.verified_at).getTime();
					const checkInTime = new Date(a.check_in_time).getTime();
					const timeDiff = Math.abs(verifiedTime - checkInTime) / (1000 * 60);
					totalCheckInTime += timeDiff;
					checkInCount++;
				}
			});

			const avgCheckInTime =
				checkInCount > 0 ? Math.round((totalCheckInTime / checkInCount) * 10) / 10 : 0;

			setStats({
				totalRegistered: event?.expected_attendance || 0,
				totalAttended,
				attendanceRate:
					event?.expected_attendance > 0
						? Math.round((totalAttended / event.expected_attendance) * 100)
						: 0,
				lateArrivals,
				verifiedParticipants: verifiedCount,
				avgCheckInTime,
			});
		} catch (error) {
			console.error("Error fetching analytics:", error);
		} finally {
			setLoading(false);
		}
	};

		fetchAnalyticsData();
	}, [isAuthorized, eventId]);

	const handleLogout = () => {
		localStorage.removeItem("isLoggedIn");
		localStorage.removeItem("userRole");
		setSidebarOpen(false);
		window.location.href = "/login";
	};

	const handleExportData = () => {
		// Create CSV data
		const headers = ["Name", "Email", "Check-in Time", "Verified Time", "Status"];
		const rows = attendanceData.map((a) => [
			a.participants?.name || "Unknown",
			a.participants?.email || "N/A",
			a.check_in_time ? new Date(a.check_in_time).toLocaleString() : "-",
			a.verified_at ? new Date(a.verified_at).toLocaleString() : "-",
			a.verified ? "Verified" : "Pending",
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		// Download CSV
		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${eventData?.event_name}_attendance_${Date.now()}.csv`;
		a.click();
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
                  className="p-2 hover:opacity-70 transition hover:scale-105 active:scale-95"
                  style={{ color: "var(--foreground)" }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                    {eventData.event_name}
                  </h1>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Analytics & Performance
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
              {/* Key Metrics */}
              <section className="animate-[fadeIn_0.3s_ease-out]">
                <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Key Metrics
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    title="Total Attendance"
                    value={`${stats.totalAttended} / ${stats.totalRegistered}`}
                    icon={Users}
                    color="#10b981"
                  />
                  <StatCard
                    title="Attendance Rate"
                    value={`${stats.attendanceRate}%`}
                    icon={TrendingUp}
                    color="#3b82f6"
                    trend={{
                      positive: stats.attendanceRate >= 75,
                      text:
                        stats.attendanceRate >= 75
                          ? "Above target"
                          : "Below target",
                    }}
                  />
                  <StatCard
                    title="Verified Participants"
                    value={stats.verifiedParticipants}
                    icon={CheckCircle}
                    color="#10b981"
                  />
                  <StatCard
                    title="Late Arrivals"
                    value={stats.lateArrivals}
                    icon={Clock}
                    color="#f97316"
                    trend={{
                      positive: stats.lateArrivals === 0,
                      text:
                        stats.lateArrivals === 0
                          ? "No late arrivals"
                          : `${stats.lateArrivals} late`,
                    }}
                  />
                  <StatCard
                    title="Avg Check-in Time"
                    value={`${stats.avgCheckInTime} min`}
                    icon={AlertCircle}
                    color="#eab308"
                  />
                </div>
              </section>

              {/* Attendance Performance */}
              <section
                className="rounded-lg border p-6 animate-[fadeIn_0.5s_ease-out]"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Attendance Performance
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span style={{ color: "var(--text-muted)" }}>On-Time Arrivals</span>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>
                        {stats.totalAttended - stats.lateArrivals} ({Math.round(((stats.totalAttended - stats.lateArrivals) / stats.totalAttended) * 100) || 0}%)
                      </span>
                    </div>
                    <div
                      className="h-3 rounded-full overflow-hidden"
                      style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          backgroundColor: "#10b981",
                          width: `${stats.totalAttended > 0 ? Math.round(((stats.totalAttended - stats.lateArrivals) / stats.totalAttended) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span style={{ color: "var(--text-muted)" }}>Late Arrivals</span>
                      <span style={{ color: "#f97316", fontWeight: "bold" }}>
                        {stats.lateArrivals} ({Math.round((stats.lateArrivals / stats.totalAttended) * 100) || 0}%)
                      </span>
                    </div>
                    <div
                      className="h-3 rounded-full overflow-hidden"
                      style={{ backgroundColor: "rgba(249, 115, 22, 0.1)" }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          backgroundColor: "#f97316",
                          width: `${stats.totalAttended > 0 ? Math.round((stats.lateArrivals / stats.totalAttended) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span style={{ color: "var(--text-muted)" }}>No Show</span>
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>
                        {stats.totalRegistered - stats.totalAttended} ({Math.round(((stats.totalRegistered - stats.totalAttended) / stats.totalRegistered) * 100) || 0}%)
                      </span>
                    </div>
                    <div
                      className="h-3 rounded-full overflow-hidden"
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          backgroundColor: "#ef4444",
                          width: `${Math.round(((stats.totalRegistered - stats.totalAttended) / stats.totalRegistered) * 100) || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Detailed Attendance List */}
              <section
                className="rounded-lg border overflow-hidden animate-[fadeIn_0.7s_ease-out]"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    Detailed Attendance
                  </h2>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm transition hover:opacity-90 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: "#3b82f6",
                      color: "white",
                    }}
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "var(--surface-soft)", borderColor: "var(--border-subtle)" }} className="border-b">
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
                          Participant
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
                          Email
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
                          Check-in Time
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
                          Status
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((attendee, idx) => {
                        const checkInTime = attendee.check_in_time
                          ? new Date(attendee.check_in_time)
                          : null;
                        const verifiedTime = attendee.verified_at
                          ? new Date(attendee.verified_at)
                          : null;
                        const duration = checkInTime && verifiedTime
                          ? Math.round((verifiedTime.getTime() - checkInTime.getTime()) / (1000 * 60))
                          : 0;

                        return (
                          <tr
                            key={idx}
                            style={{
                              backgroundColor: "var(--surface)",
                              borderColor: "var(--border-subtle)",
                            }}
                            className={idx !== attendanceData.length - 1 ? "border-b" : ""}
                          >
                            <td className="px-6 py-4 font-medium" style={{ color: "var(--foreground)" }}>
                              {attendee.participants?.name || "Unknown"}
                            </td>
                            <td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
                              {attendee.participants?.email || "N/A"}
                            </td>
                            <td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
                              {checkInTime ? checkInTime.toLocaleTimeString() : "-"}
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
                            <td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
                              {duration > 15 ? (
                                <span style={{ color: "#f97316" }}>
                                  {duration} min (Late)
                                </span>
                              ) : (
                                <span style={{ color: "#10b981" }}>
                                  {duration} min
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
