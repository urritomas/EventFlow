import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateCertificateEligibility } from "@/utils/certificates/eligibility";
import {
	buildVerificationId,
	renderCertificateEmailBody,
	renderCertificateHtml,
} from "@/utils/certificates/renderCertificateHtml";
import { sendBrevoEmail } from "@/utils/email/brevo";

function getSupabaseAdmin() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) throw new Error("Missing Supabase configuration.");
	return createClient(url, key);
}

function formatIssueDate(date = new Date()) {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export async function POST(request) {
	try {
		const body = await request.json().catch(() => ({}));
		const { eventId, participantId, attendanceId } = body || {};

		if (!eventId || !participantId || !attendanceId) {
			return NextResponse.json(
				{ error: "Missing eventId, participantId, or attendanceId." },
				{ status: 400 }
			);
		}

		const supabase = getSupabaseAdmin();
		const eventIdNum = Number(eventId);
		const participantIdNum = Number(participantId);
		const attendanceIdNum = Number(attendanceId);

		const { data: existingCert } = await supabase
			.from("certificates")
			.select("certificate_id, verification_id, email_sent_at")
			.eq("event_id", eventIdNum)
			.eq("participant_id", participantIdNum)
			.maybeSingle();

		if (existingCert?.email_sent_at) {
			return NextResponse.json({
				issued: true,
				alreadySent: true,
				verificationId: existingCert.verification_id,
				message: "Certificate was already emailed for this event.",
			});
		}

		const [{ data: attendance }, { data: event }, { data: participant }, { data: registration }] =
			await Promise.all([
				supabase
					.from("attendance")
					.select("*")
					.eq("attendance_id", attendanceIdNum)
					.maybeSingle(),
				supabase
					.from("events")
					.select("*")
					.eq("event_id", eventIdNum)
					.maybeSingle(),
				supabase
					.from("participants")
					.select("participant_id, name, email")
					.eq("participant_id", participantIdNum)
					.maybeSingle(),
				supabase
					.from("event_participants")
					.select("review_status, registration_status")
					.eq("event_id", eventIdNum)
					.eq("participant_id", participantIdNum)
					.maybeSingle(),
			]);

		if (!attendance || !event || !participant) {
			return NextResponse.json({ error: "Attendance, event, or participant not found." }, { status: 404 });
		}

		if (!participant.email) {
			return NextResponse.json({
				issued: false,
				ineligible: true,
				reason: "Participant has no email address on file.",
			});
		}

		const { data: allAttendance } = await supabase
			.from("attendance")
			.select("*")
			.eq("event_id", eventIdNum)
			.eq("participant_id", participantIdNum);

		const eligibility = evaluateCertificateEligibility({
			attendance,
			event,
			allAttendanceForParticipant: allAttendance || [],
			registration,
		});

		if (!eligibility.eligible) {
			return NextResponse.json({
				issued: false,
				ineligible: true,
				reason: eligibility.reason,
				presencePercent: eligibility.presencePercent ?? null,
			});
		}

		const verificationId =
			existingCert?.verification_id || buildVerificationId(eventIdNum, participantIdNum);
		const issueDate = formatIssueDate();
		const eventDescription =
			event.notes ||
			`${event.event_type || "Event"} participation verified through EventFlow geofence attendance tracking`;

		const certificateHtml = renderCertificateHtml({
			participantName: participant.name,
			eventName: event.event_name,
			eventDescription,
			issueDate,
			verificationId,
		});

		const emailIntro = renderCertificateEmailBody({
			participantName: participant.name,
			eventName: event.event_name,
			verificationId,
			presencePercent: eligibility.presencePercent,
		});

		const fullEmailHtml = `${emailIntro}${certificateHtml}`;

		await sendBrevoEmail({
			toEmail: participant.email,
			toName: participant.name,
			subject: `Your EventFlow Certificate – ${event.event_name}`,
			htmlContent: fullEmailHtml,
			textContent: `Congratulations ${participant.name}! Your EventFlow certificate for ${event.event_name} is ready. Verification ID: ${verificationId}. On-site attendance: ${eligibility.presencePercent}%.`,
		});

		const certPayload = {
			event_id: eventIdNum,
			participant_id: participantIdNum,
			attendance_id: attendanceIdNum,
			verification_id: verificationId,
			presence_percent: eligibility.presencePercent,
			eligibility_reason: eligibility.reason,
			recipient_email: participant.email,
			email_sent_at: new Date().toISOString(),
		};

		if (existingCert?.certificate_id) {
			await supabase
				.from("certificates")
				.update(certPayload)
				.eq("certificate_id", existingCert.certificate_id);
		} else {
			await supabase.from("certificates").insert([certPayload]);
		}

		return NextResponse.json({
			issued: true,
			emailSent: true,
			verificationId,
			presencePercent: eligibility.presencePercent,
			recipientEmail: participant.email,
			message: `Certificate emailed to ${participant.email}.`,
		});
	} catch (error) {
		console.error("[certificates/issue] Error:", error);
		return NextResponse.json(
			{
				error: "Failed to issue certificate.",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
