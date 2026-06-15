function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function buildVerificationId(eventId, participantId) {
	const year = new Date().getFullYear();
	const suffix = String(eventId).padStart(3, "0") + String(participantId).padStart(4, "0");
	return `EF-CERT-${year}-${suffix}`;
}

export function renderCertificateHtml({
	participantName,
	eventName,
	eventDescription = "An EventFlow certified participation program",
	issueDate,
	verificationId,
	directorName = "EventFlow Director",
	directorTitle = "Event Director, EventFlow Logistics",
}) {
	const name = escapeHtml(participantName);
	const program = escapeHtml(eventName);
	const desc = escapeHtml(eventDescription);
	const date = escapeHtml(issueDate);
	const certId = escapeHtml(verificationId);
	const sigName = escapeHtml(directorName);
	const sigTitle = escapeHtml(directorTitle);
	const year = new Date().getFullYear();

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>EventFlow Certificate – ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0e1a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 2rem; font-family: 'Inter', sans-serif; }
.cert-outer { position: relative; width: 100%; max-width: 820px; filter: drop-shadow(0 40px 80px rgba(0,0,0,0.7)); }
.cert { width: 100%; background: #0d1220; border-radius: 6px; overflow: hidden; position: relative; display: grid; grid-template-columns: 1fr 200px; border: 1px solid rgba(201,169,110,0.18); }
.cert::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent 0%, #9A7A3A 12%, #F0D49A 38%, #C9A96E 50%, #F0D49A 62%, #9A7A3A 88%, transparent 100%); z-index: 3; }
.cert-bg-pattern { position: absolute; inset: 0; opacity: 0.022; background-image: radial-gradient(circle, #C9A96E 1px, transparent 1px); background-size: 28px 28px; pointer-events: none; z-index: 0; }
.cert-glow { position: absolute; top: 25%; left: -80px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(201,169,110,0.055) 0%, transparent 70%); pointer-events: none; z-index: 0; }
.cert-main { padding: 3rem 3rem 2.6rem; display: flex; flex-direction: column; position: relative; z-index: 1; }
.cert-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 3rem; }
.brand-name { font-size: 12.5px; font-weight: 600; color: #C9A96E; letter-spacing: 0.06em; display: block; margin-bottom: 2px; }
.brand-sub { font-size: 8px; font-weight: 400; color: #3D4A6B; letter-spacing: 0.22em; text-transform: uppercase; display: block; }
.cert-eyebrow { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 15px; color: #5A6A8E; margin-bottom: 0.4rem; }
.cert-name { font-family: 'Cormorant Garamond', serif; font-size: 60px; font-weight: 600; color: #F5F0E8; line-height: 0.95; letter-spacing: -0.01em; margin-bottom: 0.65rem; }
.name-rule { display: flex; align-items: center; gap: 8px; margin-bottom: 1.7rem; }
.name-rule-line { height: 1px; flex: 1; background: linear-gradient(90deg, rgba(201,169,110,0.55) 0%, rgba(201,169,110,0.08) 100%); }
.name-rule-diamond { width: 5px; height: 5px; background: #C9A96E; transform: rotate(45deg); opacity: 0.65; flex-shrink: 0; }
.cert-completed { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 13.5px; color: #4A5A7A; margin-bottom: 0.45rem; }
.cert-program { font-family: 'Playfair Display', serif; font-size: 25px; font-weight: 700; color: #E8DFC8; line-height: 1.2; letter-spacing: 0.01em; margin-bottom: 0.5rem; }
.cert-desc { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 11px; color: #3D4A6B; letter-spacing: 0.02em; margin-bottom: 2.6rem; }
.cert-footer { margin-top: auto; padding-top: 1.6rem; border-top: 0.5px solid rgba(255,255,255,0.05); display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.5rem; }
.footer-micro { font-size: 8px; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: #2D3A55; margin-bottom: 5px; }
.footer-date { font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 300; color: #7A8AAA; }
.sig-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; font-style: italic; color: #C9A96E; line-height: 1; margin-bottom: 4px; }
.sig-bold { font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #3D4A6B; display: block; }
.sig-role { font-family: 'Cormorant Garamond', serif; font-size: 9.5px; font-style: italic; font-weight: 300; color: #2D3A55; display: block; }
.cert-sidebar { background: #080C18; border-left: 1px solid rgba(201,169,110,0.07); display: flex; flex-direction: column; align-items: center; padding: 2.5rem 1.3rem; position: relative; z-index: 1; }
.v-label-top { font-size: 8px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: #C9A96E; display: block; text-align: center; margin-bottom: 1px; }
.v-label-bot { font-size: 8px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: #3D4A6B; display: block; text-align: center; margin-bottom: 16px; }
.seal { position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.seal-ring { position: absolute; border-radius: 50%; }
.seal-ring-1 { inset: 0; border: 1px solid rgba(201,169,110,0.24); }
.seal-ring-2 { inset: 9px; border: 0.5px solid rgba(201,169,110,0.14); }
.seal-ring-3 { inset: 18px; border: 0.5px solid rgba(201,169,110,0.09); }
.secure-track { font-size: 7.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #2D3A55; text-align: center; margin-bottom: auto; }
.sidebar-divider { width: 32px; height: 0.5px; background: rgba(201,169,110,0.1); margin: 1.5rem 0; }
.cert-id { font-size: 7px; letter-spacing: 0.08em; color: #2A3350; text-align: center; line-height: 1.8; margin-top: 10px; }
.vert-label { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); font-size: 7px; letter-spacing: 0.25em; text-transform: uppercase; color: #1A2338; font-weight: 500; margin-top: 1.2rem; }
</style>
</head>
<body>
<div class="cert-outer">
  <div class="cert">
    <div class="cert-bg-pattern"></div>
    <div class="cert-glow"></div>
    <div class="cert-main">
      <div class="cert-brand">
        <div>
          <span class="brand-name">EventFlow</span>
          <span class="brand-sub">Professional Certification</span>
        </div>
      </div>
      <p class="cert-eyebrow">This is to certify that</p>
      <h1 class="cert-name">${name}</h1>
      <div class="name-rule"><div class="name-rule-line"></div><div class="name-rule-diamond"></div></div>
      <p class="cert-completed">has successfully completed</p>
      <h2 class="cert-program">${program}</h2>
      <p class="cert-desc">${desc}</p>
      <div class="cert-footer">
        <div>
          <p class="footer-micro">Date of Issue</p>
          <p class="footer-date">${date}</p>
        </div>
        <div>
          <p class="sig-name">${sigName}</p>
          <span class="sig-bold">${sigName}</span>
          <span class="sig-role">${sigTitle}</span>
        </div>
      </div>
    </div>
    <div class="cert-sidebar">
      <span class="v-label-top">Verified</span>
      <span class="v-label-bot">Certificate</span>
      <div class="seal">
        <div class="seal-ring seal-ring-1"></div>
        <div class="seal-ring seal-ring-2"></div>
        <div class="seal-ring seal-ring-3"></div>
      </div>
      <p class="secure-track">EventFlow<br>Secure Track</p>
      <div class="sidebar-divider"></div>
      <p class="cert-id">VERIFICATION ID<br>${certId}</p>
      <p class="vert-label">EventFlow Logistics · ${year}</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function renderCertificateEmailBody({
	participantName,
	eventName,
	verificationId,
	presencePercent,
}) {
	return `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; max-width: 560px;">
      <p>Hi ${escapeHtml(participantName)},</p>
      <p>Congratulations! You earned your EventFlow certificate for <strong>${escapeHtml(eventName)}</strong>.</p>
      <p>Your verified on-site attendance was <strong>${presencePercent}%</strong> of the scheduled event time, meeting the 80% requirement.</p>
      <p>Verification ID: <strong>${escapeHtml(verificationId)}</strong></p>
      <p>Your certificate is attached below. You can also save or print it for your records.</p>
      <p style="color:#64748b;font-size:13px;">EventFlow Secure Track</p>
    </div>
  `;
}
