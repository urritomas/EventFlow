/**
 * Send transactional email via Brevo (Sendinblue) API.
 * Requires: BREVO_API_KEY, BREVO_SENDER_EMAIL
 */
export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent, attachments }) {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const senderName = process.env.BREVO_SENDER_NAME || "EventFlow";

	if (!apiKey || !senderEmail) {
		throw new Error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL environment variables.");
	}

	const bodyPayload = {
		sender: { name: senderName, email: senderEmail },
		to: [{ email: toEmail, name: toName || toEmail }],
		subject,
		htmlContent,
		textContent: textContent || undefined,
	};

	if (attachments && Array.isArray(attachments) && attachments.length) {
		bodyPayload.attachment = attachments.map((a) => {
			const name = a.name || 'attachment';

			if (a.url) return { url: a.url, name };

			// Ensure content is a base64 string — Brevo rejects raw binary
			let content = a.content;
			if (Buffer.isBuffer(content)) {
				content = content.toString('base64');
			} else if (content instanceof Uint8Array) {
				content = Buffer.from(content).toString('base64');
			} else if (Array.isArray(content)) {
				content = Buffer.from(content).toString('base64');
			} else if (typeof content !== 'string') {
				content = Buffer.from(content).toString('base64');
			}
			// If it's already a string, check if it looks like base64
			// (if it came as a comma-separated number string from the logs, convert it)
			else if (typeof content === 'string' && content.includes(',')) {
				try {
					const nums = content.split(',').map(Number);
					content = Buffer.from(nums).toString('base64');
				} catch {
					// leave as-is if parsing fails
				}
			}

			return { content, name };
		});
	}

	if (bodyPayload.attachment) {
		try {
			const debug = {
				...bodyPayload,
				attachment: bodyPayload.attachment.map((a) => ({
					name: a.name,
					contentLength: a.content ? a.content.length : 0,
					isBase64: typeof a.content === 'string',
				})),
			};
			console.debug('[sendBrevoEmail] payload preview:', JSON.stringify(debug, null, 2));
		} catch (err) {
			// ignore
		}
	}

	const response = await fetch("https://api.brevo.com/v3/smtp/email", {
		method: "POST",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
			"api-key": apiKey,
		},
		body: JSON.stringify(bodyPayload),
	});

	if (!response.ok) {
		const body = await response.text();
		console.error('[sendBrevoEmail] API response error:', body);
		throw new Error(`Brevo API error (${response.status}): ${body}`);
	}

	return response.json().catch(() => ({}));
}