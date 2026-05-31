"use client";

import { useState, useEffect } from "react";
import {
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Clock,
	CheckCircle2,
	XCircle,
	Info,
} from "lucide-react";

function Tooltip({ children, text }) {
	const [isVisible, setIsVisible] = useState(false);

	return (
		<div className="relative inline-block">
			<button
				className="p-1 hover:opacity-70 transition"
				onMouseEnter={() => setIsVisible(true)}
				onMouseLeave={() => setIsVisible(false)}
				onClick={() => setIsVisible(!isVisible)}
			>
				<Info size={16} style={{ color: "var(--text-muted)" }} />
			</button>
			{isVisible && (
				<div
					className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-md text-xs whitespace-nowrap z-10 shadow-lg"
					style={{
						backgroundColor: "rgba(0, 0, 0, 0.8)",
						color: "white",
					}}
				>
					{text}
					<div
						className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
						style={{
							borderLeft: "4px solid transparent",
							borderRight: "4px solid transparent",
							borderTop: "4px solid rgba(0, 0, 0, 0.8)",
						}}
					/>
				</div>
			)}
		</div>
	);
}

function StatusBadge({ category }) {
	let badgeColor;

	switch (category) {
		case "Regular":
			badgeColor = {
				bg: "rgba(16, 185, 129, 0.1)",
				text: "#10b981",
				border: "#10b981",
				icon: CheckCircle2,
			};
			break;
		case "Late":
			badgeColor = {
				bg: "rgba(234, 179, 8, 0.1)",
				text: "#eab308",
				border: "#eab308",
				icon: Clock,
			};
			break;
		case "Irregular":
			badgeColor = {
				bg: "rgba(249, 115, 22, 0.1)",
				text: "#f97316",
				border: "#f97316",
				icon: TrendingDown,
			};
			break;
		case "High-Risk":
			badgeColor = {
				bg: "rgba(239, 68, 68, 0.1)",
				text: "#ef4444",
				border: "#ef4444",
				icon: AlertTriangle,
			};
			break;
		default:
			badgeColor = {
				bg: "rgba(107, 114, 128, 0.1)",
				text: "#6b7280",
				border: "#6b7280",
				icon: Info,
			};
	}

	const Icon = badgeColor.icon;

	return (
		<div
			className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2"
			style={{
				backgroundColor: badgeColor.bg,
				color: badgeColor.text,
				borderColor: badgeColor.border,
			}}
		>
			<Icon size={18} />
			<span className="font-semibold text-sm">{category}</span>
		</div>
	);
}

function MetricRow({ icon: Icon, label, value, unit = "", tooltipText = "" }) {
	return (
		<div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
			<div className="flex items-center gap-3">
				<div
					className="p-2 rounded-lg"
					style={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}
				>
					<Icon size={16} style={{ color: "#10b981" }} />
				</div>
				<div className="flex items-center gap-2">
					<span style={{ color: "var(--text-muted)" }} className="text-sm">
						{label}
					</span>
					{tooltipText && <Tooltip text={tooltipText} />}
				</div>
			</div>
			<span className="font-semibold" style={{ color: "var(--foreground)" }}>
				{value}
				{unit && <span style={{ color: "var(--text-muted)" }}>{unit}</span>}
			</span>
		</div>
	);
}

function TrendIndicator({ value, isPositive = true }) {
	const TrendIcon = isPositive ? TrendingUp : TrendingDown;
	const color = isPositive ? "#10b981" : "#ef4444";

	return (
		<div className="flex items-center gap-1">
			<TrendIcon size={16} style={{ color }} />
			<span style={{ color, fontSize: "12px", fontWeight: "600" }}>
				{Math.abs(value)}% {isPositive ? "improvement" : "decline"}
			</span>
		</div>
	);
}

export default function BehaviorAnalyticsCard({ participantId }) {
	const [classification, setClassification] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedMetrics, setExpandedMetrics] = useState(false);

	useEffect(() => {
		const fetchBehaviorClassification = async () => {
			try {
				setLoading(true);
				const response = await fetch(
					`/api/behavior-classification?participantId=${participantId}`
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch classification: ${response.statusText}`);
				}

				const data = await response.json();
				setClassification(data);
				setError(null);
			} catch (err) {
				console.error("Error fetching behavior classification:", err);
				setError(err instanceof Error ? err.message : "Unknown error occurred");
			} finally {
				setLoading(false);
			}
		};

		if (participantId) {
			fetchBehaviorClassification();

			// Optionally refresh every 5 minutes for real-time updates
			const interval = setInterval(fetchBehaviorClassification, 5 * 60 * 1000);
			return () => clearInterval(interval);
		}
	}, [participantId]);

	if (loading) {
		return (
			<div
				className="rounded-lg border p-6 shadow-sm"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border-subtle)",
				}}
			>
				<div className="flex items-center justify-center h-32">
					<div
						className="animate-spin rounded-full h-8 w-8 border-b-2"
						style={{ borderColor: "#10b981" }}
					/>
				</div>
			</div>
		);
	}

	if (error || !classification) {
		return (
			<div
				className="rounded-lg border p-6 shadow-sm"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border-subtle)",
				}}
			>
				<div className="text-center">
					<XCircle
						size={32}
						style={{ color: "#ef4444", margin: "0 auto", marginBottom: "12px" }}
					/>
					<p style={{ color: "var(--text-muted)" }} className="text-sm">
						{error || "Failed to load behavior analytics"}
					</p>
				</div>
			</div>
		);
	}

	const getRiskColor = (level) => {
		switch (level) {
			case "Low":
				return "#10b981";
			case "Medium":
				return "#eab308";
			case "High":
				return "#f97316";
			case "Critical":
				return "#ef4444";
			default:
				return "#6b7280";
		}
	};

	const getRiskBgColor = (level) => {
		switch (level) {
			case "Low":
				return "rgba(16, 185, 129, 0.1)";
			case "Medium":
				return "rgba(234, 179, 8, 0.1)";
			case "High":
				return "rgba(249, 115, 22, 0.1)";
			case "Critical":
				return "rgba(239, 68, 68, 0.1)";
			default:
				return "rgba(107, 114, 128, 0.1)";
		}
	};

	return (
		<div
			className="rounded-lg border p-6 shadow-sm"
			style={{
				backgroundColor: "var(--surface)",
				borderColor: "var(--border-subtle)",
			}}
		>
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-4">
					<h3 style={{ color: "var(--foreground)" }} className="text-lg font-semibold">
						Behavior Analytics
					</h3>
					<Tooltip text="Your behavior classification is based on attendance rate, punctuality, and consistency." />
				</div>

				{/* Status Badge */}
				<StatusBadge category={classification.category} />

				{/* Explanation */}
				<p
					style={{ color: "var(--text-muted)" }}
					className="text-sm mt-4"
				>
					{classification.explanation}
				</p>
			</div>

			{/* Risk Indicator */}
			<div
				className="rounded-lg p-4 mb-6 border border-white/5"
				style={{
					backgroundColor: getRiskBgColor(classification.riskLevel),
					borderColor: getRiskColor(classification.riskLevel),
				}}
			>
				<div className="flex items-center gap-2">
					<AlertTriangle
						size={18}
						style={{ color: getRiskColor(classification.riskLevel) }}
					/>
					<div>
						<p
							className="text-xs font-semibold uppercase tracking-wider"
							style={{ color: getRiskColor(classification.riskLevel) }}
						>
							Risk Level
						</p>
						<p style={{ color: "var(--foreground)" }} className="text-sm font-semibold">
							{classification.riskLevel}
						</p>
					</div>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="mb-6">
				<h4
					style={{ color: "var(--foreground)" }}
					className="text-sm font-semibold mb-3 uppercase tracking-wider"
				>
					Key Metrics
				</h4>

				<MetricRow
					icon={CheckCircle2}
					label="Attendance Rate"
					value={classification.metrics.attendanceRate}
					unit="%"
					tooltipText="Percentage of registered events attended"
				/>

				<MetricRow
					icon={CheckCircle2}
					label="Events Attended"
					value={classification.metrics.totalEventsAttended}
					unit={` / ${classification.metrics.totalEventsRegistered}`}
					tooltipText="Number of events attended out of registered events"
				/>

				<MetricRow
					icon={XCircle}
					label="Events Missed"
					value={classification.metrics.absences}
					tooltipText="Number of registered events not attended"
				/>

				<MetricRow
					icon={Clock}
					label="Late Check-ins"
					value={classification.metrics.lateCheckIns}
					tooltipText="Number of times checked in after event start time"
				/>

				{classification.metrics.consecutiveMissedEvents > 0 && (
					<MetricRow
						icon={TrendingDown}
						label="Max Consecutive Misses"
						value={classification.metrics.consecutiveMissedEvents}
						tooltipText="Longest streak of consecutive missed events"
					/>
				)}

				{classification.metrics.averageLateness > 0 && (
					<MetricRow
						icon={Clock}
						label="Average Lateness"
						value={classification.metrics.averageLateness}
						unit=" min"
						tooltipText="Average number of minutes late per check-in"
					/>
				)}

				{classification.metrics.lastAttendanceDate && (
					<MetricRow
						icon={CheckCircle2}
						label="Last Attendance"
						value={classification.metrics.lastAttendanceDate}
						tooltipText="Date of most recent event attendance"
					/>
				)}
			</div>

			{/* Recommendations */}
			{classification.recommendations.length > 0 && (
				<div className="mb-6">
					<h4
						style={{ color: "var(--foreground)" }}
						className="text-sm font-semibold mb-3 uppercase tracking-wider"
					>
						Recommendations
					</h4>
					<ul className="space-y-2">
						{classification.recommendations.map((rec, idx) => (
							<li
								key={idx}
								className="flex items-start gap-2 text-sm"
								style={{ color: "var(--text-muted)" }}
							>
								<span
									className="inline-flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 mt-0.5 text-xs font-semibold"
									style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
								>
									{idx + 1}
								</span>
								<span>{rec}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Last Updated */}
			<div
				className="text-xs"
				style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}
			>
				Last updated: {new Date(classification.lastUpdated).toLocaleString()}
			</div>
		</div>
	);
}
