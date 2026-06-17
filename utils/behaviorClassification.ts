import { createClient as createServerClient } from "@/utils/supabase/server";

export type BehaviorCategory = "Regular" | "Late" | "Irregular" | "High-Risk" | "New Member" | "Not Yet Scaled";

export interface BehaviorMetrics {
	totalEventsRegistered: number;
	totalEventsAttended: number;
	attendanceRate: number;
	lateCheckIns: number;
	absences: number;
	consecutiveMissedEvents: number;
	averageLateness: number;
	lastAttendanceDate: string | null;
}

export interface BehaviorClassification {
	category: BehaviorCategory;
	metrics: BehaviorMetrics;
	explanation: string;
	riskLevel: "Low" | "Medium" | "High" | "Critical";
	recommendations: string[];
	lastUpdated: string;
}

/**
 * Calculate attendance metrics for a participant
 */
async function calculateMetrics(participantId: string | number): Promise<BehaviorMetrics> {
	const supabase = await createServerClient();

	try {
		// Fetch all events the participant is registered for
		const { data: registrationData, error: registrationError } = await supabase
			.from("event_participants")
			.select("*")
			.eq("participant_id", participantId);

		if (registrationError) {
			console.error("Error fetching registration data:", registrationError);
			throw new Error("Failed to fetch registration data");
		}

		// Try to fetch attendance data (may not exist yet)
		let attendanceData: any[] = [];
		try {
			const { data: attendData, error: attendError } = await supabase
				.from("attendance")
				.select("*")
				.eq("participant_id", participantId);

			if (!attendError) {
				attendanceData = attendData || [];
			}
		} catch (e) {
			// Attendance table might not exist, continue with registration data only
			console.log("Attendance table not accessible, using registration data only");
		}

const registeredEvents = registrationData || [];
		const attendedEvents = attendanceData.filter(a => a.verified);

		const totalEventsRegistered = registeredEvents.length;
		const totalEventsAttended = attendedEvents.length;
		const attendanceRate =
			totalEventsRegistered > 0
				? Math.round((totalEventsAttended / totalEventsRegistered) * 100)
				: 0;

			// Calculate late arrivals by comparing check-in time vs event start time
			const lateCheckIns = attendanceData.filter((record) => {
				if (!record.check_in_time) return false;
				// Use pre-calculated is_late if available, otherwise check late_minutes
				if (record.is_late === true) return true;
				if (record.late_minutes && record.late_minutes > 15) return true;
				return false;
			}).length;

		const absences = totalEventsRegistered - totalEventsAttended;

		// Calculate consecutive missed events
		let consecutiveMissedEvents = 0;
		if (totalEventsRegistered > 0 && registeredEvents.length > 0) {
			let currentConsecutive = 0;
			for (const reg of registeredEvents) {
				const isAttended = attendedEvents.some(a => a.event_id === reg.event_id);
				if (!isAttended) {
					currentConsecutive++;
					consecutiveMissedEvents = Math.max(consecutiveMissedEvents, currentConsecutive);
				} else {
					currentConsecutive = 0;
				}
			}
		}

		const averageLateness =
			attendanceData.length > 0
				? Math.round(
						attendanceData.reduce((sum, record) => {
							if (!record.verified_at || !record.check_in_time) return sum;
							const verifiedTime = new Date(record.verified_at).getTime();
							const checkInTime = new Date(record.check_in_time).getTime();
							const lateness = Math.max(0, (verifiedTime - checkInTime) / (1000 * 60));
							return sum + lateness;
						}, 0) / attendanceData.length
					)
				: 0;

		const lastAttendanceDate =
			attendedEvents.length > 0
				? new Date(attendedEvents[attendedEvents.length - 1]?.verified_at).toISOString().split("T")[0]
				: null;

		return {
			totalEventsRegistered,
			totalEventsAttended,
			attendanceRate,
			lateCheckIns,
			absences,
			consecutiveMissedEvents,
			averageLateness,
			lastAttendanceDate,
		};
	} catch (error) {
		console.error("Error calculating metrics:", error);
		// Return default metrics if there's an error
		return {
			totalEventsRegistered: 0,
			totalEventsAttended: 0,
			attendanceRate: 0,
			lateCheckIns: 0,
			absences: 0,
			consecutiveMissedEvents: 0,
			averageLateness: 0,
			lastAttendanceDate: null,
		};
	}
}

/**
 * Classify participant behavior based on metrics
 */
function classifyBehavior(metrics: BehaviorMetrics): {
	category: BehaviorCategory;
	riskLevel: "Low" | "Medium" | "High" | "Critical";
	explanation: string;
	recommendations: string[];
} {
	const { totalEventsRegistered, attendanceRate, lateCheckIns, consecutiveMissedEvents, totalEventsAttended } = metrics;
	const latePercentage =
		totalEventsAttended > 0
			? Math.round((lateCheckIns / totalEventsAttended) * 100)
			: 0;

	let category: BehaviorCategory;
	let riskLevel: "Low" | "Medium" | "High" | "Critical";
	let explanation: string;
	let recommendations: string[] = [];

	// Not yet scaled: No events registered or attended
	if (totalEventsRegistered === 0 && totalEventsAttended === 0) {
		category = "Not Yet Scaled";
		riskLevel = "Low";
		explanation = "No attendance history yet. Register for events to start tracking your attendance patterns.";
		recommendations = [
			"Browse available events",
			"Register for an upcoming event",
			"Attend your first event",
			"Build your attendance record",
		];
	}
	// New member: Just registered, no attendance yet
	else if (totalEventsRegistered > 0 && totalEventsAttended === 0 && attendanceRate === 0) {
		category = "New Member";
		riskLevel = "Low";
		explanation = `Participant just joined and is registered for ${totalEventsRegistered} event(s). Ready for their first attendance.`;
		recommendations = [
			"Welcome to the program",
			"Prepare for upcoming event",
			"Set personal attendance goals",
			"Get familiar with the venue and schedule",
		];
	}
	// High-Risk: below 50% attendance or 3+ consecutive absences
	else if (attendanceRate < 50 || consecutiveMissedEvents >= 3) {
		category = "High-Risk";
		riskLevel = "Critical";
		explanation = `Attendance rate is ${attendanceRate}%${
			consecutiveMissedEvents >= 3
				? ` with ${consecutiveMissedEvents} consecutive missed events`
				: ""
		}. This indicates serious attendance issues.`;
		recommendations = [
			"Contact participant immediately",
			"Inquire about barriers to attendance",
			"Offer alternative participation options",
			"Consider mentorship or support program",
		];
	}
	// Irregular: 50-74% attendance
	else if (attendanceRate >= 50 && attendanceRate <= 74) {
		category = "Irregular";
		riskLevel = "High";
		explanation = `Attendance rate is ${attendanceRate}%. While not consistently absent, attendance patterns are inconsistent.`;
		recommendations = [
			"Encourage regular attendance through reminders",
			"Identify obstacles to consistent participation",
			"Provide flexible scheduling options if possible",
			"Set attendance goals for next quarter",
		];
	}
	// Late: 75%+ attendance but 30%+ late check-ins
	else if (attendanceRate >= 75 && latePercentage >= 30) {
		category = "Late";
		riskLevel = "Medium";
		explanation = `Good attendance (${attendanceRate}%), but participant is frequently late (${latePercentage}% of check-ins are late).`;
		recommendations = [
			"Send time reminders 15 minutes before event start",
			"Discuss time management or scheduling conflicts",
			"Offer early check-in options if available",
			"Recognize improvements in punctuality",
		];
	}
	// Regular: 90%+ attendance and <10% late check-ins
	else if (attendanceRate >= 90 && latePercentage < 10) {
		category = "Regular";
		riskLevel = "Low";
		explanation = `Excellent attendance (${attendanceRate}%) with consistent punctuality. Participant demonstrates strong commitment.`;
		recommendations = [
			"Recognize and reward consistent attendance",
			"Consider as peer mentor for other participants",
			"Invite to leadership or advanced opportunities",
			"Maintain regular communication",
		];
	}
	// Default to Regular if 90%+ even with some lateness
	else if (attendanceRate >= 90) {
		category = "Regular";
		riskLevel = "Low";
		explanation = `Strong attendance rate (${attendanceRate}%). Despite occasional lateness, overall commitment is solid.`;
		recommendations = [
			"Provide positive reinforcement",
			"Minor suggestions on punctuality if needed",
			"Consider for leadership roles",
			"Maintain engagement level",
		];
	}
	// Fallback to Late category
	else {
		category = "Late";
		riskLevel = "Medium";
		explanation = `Attendance rate is ${attendanceRate}% with frequent late arrivals (${latePercentage}% of check-ins are late).`;
		recommendations = [
			"Discuss punctuality expectations",
			"Identify scheduling challenges",
			"Provide attendance coaching",
			"Monitor improvement over time",
		];
	}

	return { category, riskLevel, explanation, recommendations };
}

/**
 * Get complete behavior classification for a participant
 */
export async function getBehaviorClassification(
	participantId: string
): Promise<BehaviorClassification> {
	const metrics = await calculateMetrics(participantId);
	const { category, riskLevel, explanation, recommendations } =
		classifyBehavior(metrics);

	return {
		category,
		metrics,
		explanation,
		riskLevel,
		recommendations,
		lastUpdated: new Date().toISOString(),
	};
}

/**
 * Get behavior classifications for multiple participants
 */
export async function getBehaviorClassificationsForEvent(
	eventId: string
): Promise<Map<string, BehaviorClassification>> {
	const supabase = await createServerClient();

	// Fetch all participants for the event
	const { data: participants, error } = await supabase
		.from("event_participants")
		.select(
			`
			participant_id,
			participants (
				participant_id,
				name
			)
		`
		)
		.eq("event_id", eventId);

	if (error) {
		console.error("Error fetching event participants:", error);
		throw new Error("Failed to fetch event participants");
	}

	const classifications = new Map<string, BehaviorClassification>();

	for (const record of participants || []) {
		const classification = await getBehaviorClassification(record.participant_id);
		classifications.set(record.participant_id, classification);
	}

	return classifications;
}

/**
 * Get summary statistics of behavior classifications for an event
 */
export async function getBehaviorSummary(eventId: string) {
	const classifications = await getBehaviorClassificationsForEvent(eventId);

	const summary = {
		total: classifications.size,
		regular: 0,
		late: 0,
		irregular: 0,
		highRiskCount: 0,
		averageAttendanceRate: 0,
		criticalRisk: [] as string[],
		highRiskList: [] as string[],
		newMembers: 0,
	};

	let totalAttendanceRate = 0;

	for (const [participantId, classification] of classifications) {
		switch (classification.category) {
			case "Regular":
				summary.regular++;
				break;
			case "Late":
				summary.late++;
				break;
			case "Irregular":
				summary.irregular++;
				break;
			case "High-Risk":
				summary.highRiskCount++;
				if (classification.riskLevel === "Critical") {
					summary.criticalRisk.push(participantId);
				}
				break;
			case "New Member":
				summary.newMembers++;
				break;
		}

		totalAttendanceRate += classification.metrics.attendanceRate;

		if (classification.riskLevel === "High" || classification.riskLevel === "Critical") {
			summary.highRiskList.push(participantId);
		}
	}

	summary.averageAttendanceRate =
		classifications.size > 0
			? Math.round(totalAttendanceRate / classifications.size)
			: 0;

	return summary;
}
