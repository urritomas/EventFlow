const MIN_PRESENCE_PERCENT = 80;

function parseEventBounds(event) {
	if (!event?.event_date || !event?.start_time) {
		return { start: null, end: null, durationMs: 60 * 60 * 1000 };
	}

	const start = new Date(`${event.event_date}T${event.start_time}`);
	let end = event.end_time
		? new Date(`${event.event_date}T${event.end_time}`)
		: new Date(start.getTime() + 60 * 60 * 1000);

	if (end <= start) {
		end = new Date(start.getTime() + 60 * 60 * 1000);
	}

	return { start, end, durationMs: end - start };
}

/**
 * Rule-based certificate eligibility using geofence-verified session time.
 * Requires check-in + check-out and at least 80% of scheduled event duration on-site.
 */
export function evaluateCertificateEligibility({
	attendance,
	event,
	allAttendanceForParticipant = [],
	registration = null,
}) {
	if (!attendance?.check_in_time || !attendance?.check_out_time) {
		return { eligible: false, reason: "Incomplete attendance session (missing check-in or check-out)." };
	}

	const checkIn = new Date(attendance.check_in_time);
	const checkOut = new Date(attendance.check_out_time);
	const sessionMs = checkOut.getTime() - checkIn.getTime();

	if (sessionMs <= 0) {
		return { eligible: false, reason: "Invalid attendance session times." };
	}

	const { durationMs: eventDurationMs } = parseEventBounds(event);
	const presencePercent = Math.round((sessionMs / eventDurationMs) * 100);

	if (presencePercent < MIN_PRESENCE_PERCENT) {
		return {
			eligible: false,
			reason: `On-site time was ${presencePercent}% of the event (requires ${MIN_PRESENCE_PERCENT}%).`,
			presencePercent,
		};
	}

	if (event?.with_Geo) {
		if (!attendance.check_out_verified) {
			return {
				eligible: false,
				reason: "Checkout must be verified inside the event geofence.",
				presencePercent,
			};
		}
	}

	if (event?.with_FaceId) {
		const records = allAttendanceForParticipant.length
			? allAttendanceForParticipant
			: [attendance];
		const faceVerified = records.some(
			(row) => row.verification_method === "face" && row.verified === true
		);
		if (!faceVerified && attendance.verified !== true) {
			return {
				eligible: false,
				reason: "Face ID verification is required for this event.",
				presencePercent,
			};
		}
	}

	if (registration?.review_status && registration.review_status !== "accepted") {
		return {
			eligible: false,
			reason: "Organizer has not accepted this registration yet.",
			presencePercent,
		};
	}

	return {
		eligible: true,
		presencePercent,
		reason: `Met ${presencePercent}% on-site attendance requirement.`,
	};
}
