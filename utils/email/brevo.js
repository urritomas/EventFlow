/**
 * Send transactional email via Brevo (Sendinblue) API.
 * Requires: BREVO_API_KEY, BREVO_SENDER_EMAIL
 */
export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const senderName = process.env.BREVO_SENDER_NAME || "EventFlow";

	if (!apiKey || !senderEmail) {
		throw new Error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL environment variables.");
	}

	const response = await fetch("https://api.brevo.com/v3/smtp/email", {
		method: "POST",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
			"api-key": apiKey,
		},
		body: JSON.stringify({
			sender: { name: senderName, email: senderEmail },
			to: [{ email: toEmail, name: toName || toEmail }],
			subject,
			htmlContent,
			textContent: textContent || undefined,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Brevo API error (${response.status}): ${body}`);
	}

	return response.json().catch(() => ({}));
}
