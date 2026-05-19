"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";

const serviceOptions = [
	{
		key: "rfid",
		label: "RFID Scanner Attendance",
		description:
			"Fast contactless tap-in and tap-out with badge scanning and live attendance logs.",
		badge: "Core",
	},
	{
		key: "geofencing",
		label: "Geofencing Validation",
		description:
			"Restrict attendance to the approved venue radius and verify location in real time.",
		badge: "Location",
	},
	{
		key: "facialRecognition",
		label: "Facial Recognition Attendance",
		description:
			"Confirm identity with biometric face matching to reduce proxy attendance.",
		badge: "AI",
	},
];

const eventTypeOptions = [
	"Conference",
	"Workshop",
	"Seminar",
	"Training",
	"Campus Event",
	"Corporate Event",
	"Other",
];

function SectionLabel({ children }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 backdrop-blur">
			<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
			{children}
		</span>
	);
}

function Button({ children, href, variant = "primary", type = "button", disabled = false }) {
	const base =
		"inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300";
	const styles =
		variant === "primary"
			? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
			: "border border-white/15 bg-white/8 text-white backdrop-blur hover:border-emerald-300/60 hover:bg-white/12 disabled:opacity-50 disabled:cursor-not-allowed";

	if (href) {
		return (
			<a className={`${base} ${styles}`} href={href}>
				{children}
			</a>
		);
	}

	return (
		<button type={type} className={`${base} ${styles}`} disabled={disabled}>
			{children}
		</button>
	);
}

function Card({ children, className = "" }) {
	return (
		<div
			className={`rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(4,10,23,0.32)] backdrop-blur-xl ${className}`}
		>
			{children}
		</div>
	);
}

function Field({ label, children, hint }) {
	return (
		<label className="block">
			<div className="mb-2 flex items-center justify-between gap-4">
				<span className="text-sm font-semibold text-slate-100">{label}</span>
				{hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
			</div>
			{children}
		</label>
	);
}

export default function HiringDetailsPage() {
	const [formState, setFormState] = useState({
		fullName: "",
		organization: "",
		email: "",
		phone: "",
		eventName: "",
		eventType: "Conference",
		expectedAttendance: "",
		eventDate: "",
		startTime: "",
		endTime: "",
		venueName: "",
		fullAddress: "",
		notes: "",
		rfid: true,
		geofencing: true,
		facialRecognition: false,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const selectedServices = serviceOptions.filter((service) => formState[service.key]);

	const estimatedScope = useMemo(() => {
		const attendance = Number(formState.expectedAttendance || 0);
		const serviceCount = selectedServices.length;
		const baseSetup = 320;
		const scale = attendance > 0 ? Math.max(180, Math.round(attendance * 0.85)) : 0;
		const servicePremium = serviceCount * 140;
		return baseSetup + scale + servicePremium;
	}, [formState.expectedAttendance, selectedServices.length]);

	const deploymentChecklist = [
		["Database ready", "events + clients + attendance records"],
		["Identity layer", formState.facialRecognition ? "face_embeddings enabled" : "optional for later"],
		["Location layer", formState.geofencing ? "venue radius validation active" : "can be added later"],
		["Device layer", formState.rfid ? "RFID scan stations included" : "manual entry fallback"],
	];

	const updateField = (field) => (event) => {
		const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
		setFormState((current) => ({ ...current, [field]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		setSubmitMessage("");

		try {
			const supabase = createClient();

			// 1. Create or get client (organization)
			const { data: clientData, error: clientError } = await supabase
				.from("clients")
				.insert([
					{
						name: formState.organization,
						contact_email: formState.email,
						contact_name: formState.fullName,
						contact_phone: formState.phone,
					},
				])
				.select();

			if (clientError) throw clientError;

			const clientId = clientData[0].id;

			// 2. Create event in events table
			const services = {
				rfid: formState.rfid,
				geofencing: formState.geofencing,
				facialRecognition: formState.facialRecognition,
			};

			const { data: eventData, error: eventError } = await supabase
				.from("events")
				.insert([
					{
						name: formState.eventName,
						type: formState.eventType,
						client_id: clientId,
						expected_attendance: parseInt(formState.expectedAttendance) || 0,
						event_date: formState.eventDate,
						start_time: formState.startTime,
						end_time: formState.endTime,
						venue_name: formState.venueName,
						full_address: formState.fullAddress,
						services: services,
						notes: formState.notes,
						estimated_scope: estimatedScope,
						status: "pending_approval",
					},
				])
				.select();

			if (eventError) throw eventError;

			setSubmitMessage("✓ Request submitted successfully! We'll review and contact you soon.");
			setFormState({
				fullName: "",
				organization: "",
				email: "",
				phone: "",
				eventName: "",
				eventType: "Conference",
				expectedAttendance: "",
				eventDate: "",
				startTime: "",
				endTime: "",
				venueName: "",
				fullAddress: "",
				notes: "",
				rfid: true,
				geofencing: true,
				facialRecognition: false,
			});
		} catch (error) {
			setSubmitMessage(`Error: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<SiteHeader showBack />
			<main
				className="themed-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(202,138,4,0.16),transparent_24%),linear-gradient(180deg,var(--hero-top)_0%,var(--hero-mid)_34%,var(--page-bg-soft)_34%,var(--page-bg)_100%)]"
				style={{ color: "var(--foreground)" }}
			>
			<section className="relative isolate border-b border-white/10 text-white">
				<div className="absolute inset-0 -z-10 bg-(--hero-overlay)" />
				<div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[64px_64px] opacity-40" />
				<div className="mx-auto grid max-w-7xl gap-16 px-6 pb-20 pt-8 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:pb-24 lg:pt-14">
					<div className="max-w-2xl">
						<SectionLabel>EventFlow™ Hiring Details</SectionLabel>
						<h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
							Hire EventFlow for a smarter attendance rollout.
						</h1>
						<p className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl">
							Tell us about your event, choose the attendance tools you want, and we’ll shape the setup around your
							required flow, venue, and participant volume.
						</p>
						<div className="mt-10 flex flex-col gap-4 sm:flex-row">
							<Button href="#hire-form">Start your request</Button>
							<Button href="#service-options" variant="secondary">
								Customize features
							</Button>
						</div>
						<div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
							{[
								["Event-ready", "Inputs mapped to your database schema"],
								["Flexible stack", "Choose RFID, geofencing, or face attendance"],
								["Future-proof", "Built to connect with your existing tables later"],
							].map(([title, text]) => (
								<div key={title} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
									<p className="text-sm font-semibold text-white">{title}</p>
									<p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
								</div>
							))}
						</div>
					</div>

					<div className="relative">
						<div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
						<div className="absolute -right-2 bottom-4 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
						<div className="relative rounded-4xl border border-white/10 bg-white/7 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
							<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
								<span>Hiring request preview</span>
								<span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300">Interactive</span>
							</div>
							<div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
								<Card className="bg-(--hero-card) p-4">
									<p className="text-sm text-slate-400">Selected services</p>
									<div className="mt-4 space-y-3">
										{selectedServices.map((service) => (
											<div key={service.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
												<p className="text-sm font-semibold text-white">{service.label}</p>
												<p className="mt-1 text-sm leading-6 text-slate-300">{service.description}</p>
											</div>
										))}
									</div>
									<div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Estimated scope</p>
										<p className="mt-1 text-2xl font-semibold text-white">{estimatedScope.toLocaleString()}</p>
										<p className="text-sm text-emerald-100/80">Planning units based on attendance and selected services</p>
									</div>
								</Card>

								<div className="grid gap-4">
									{deploymentChecklist.map(([title, text]) => (
										<Card key={title} className="bg-(--hero-card) p-4">
											<div className="flex items-center gap-3">
												<div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/15 text-lg text-emerald-300">
													✓
												</div>
												<div>
													<p className="text-sm text-slate-300">{title}</p>
													<p className="font-semibold text-white">{text}</p>
												</div>
											</div>
										</Card>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="service-options" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
				<div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
					<div>
						<SectionLabel>Customize the setup</SectionLabel>
						<h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
							Choose the attendance features you want to deploy.
						</h2>
						<p className="mt-5 text-lg leading-8 text-slate-600">
							Use any combination of RFID, geofencing, and facial recognition. The request stays flexible so the
							implementation can fit your venue, security policy, and event size.
						</p>
						<div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-700 shadow-sm">
							<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Later use</p>
							<p className="mt-3 text-base leading-7">
								We’ll keep the structure aligned with your database so this can later connect to events, clients,
								participants, attendance, attendance reports, and face embeddings.
							</p>
						</div>
					</div>

					<div className="grid gap-4">
						{serviceOptions.map((service) => (
							<Card key={service.key} className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
								<label className="flex cursor-pointer items-start gap-4 p-6">
									<input
										type="checkbox"
										checked={formState[service.key]}
										onChange={updateField(service.key)}
										className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
									/>
									<div className="flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-lg font-semibold text-slate-950">{service.label}</p>
											<span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
												{service.badge}
											</span>
										</div>
										<p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
									</div>
								</label>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section id="hire-form" className="mx-auto max-w-7xl px-6 pb-20 sm:px-10 lg:px-12">
				<Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<form className="space-y-8 p-6 sm:p-8" onSubmit={handleSubmit}>
							<div>
								<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Hire request</p>
								<h3 className="mt-3 text-2xl font-semibold text-slate-950">Fill out the event and contact details.</h3>
								<p className="mt-2 text-sm leading-6 text-slate-600">
									These fields map directly to the event table attributes from your database, so the request can be stored
									cleanly later.
								</p>
							</div>

							<div className="grid gap-5 sm:grid-cols-2">
								<Field label="Full name">
									<input
										type="text"
										value={formState.fullName}
										onChange={updateField("fullName")}
										placeholder="Your full name"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Organization">
									<input
										type="text"
										value={formState.organization}
										onChange={updateField("organization")}
										placeholder="School, company, or institution"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Email address">
									<input
										type="email"
										value={formState.email}
										onChange={updateField("email")}
										placeholder="name@example.com"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Phone number">
									<input
										type="tel"
										value={formState.phone}
										onChange={updateField("phone")}
										placeholder="+63 9xx xxx xxxx"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
							</div>

							<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
								<Field label="Event name">
									<input
										type="text"
										value={formState.eventName}
										onChange={updateField("eventName")}
										placeholder="Annual summit"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Event type">
									<select
										value={formState.eventType}
										onChange={updateField("eventType")}
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
									>
										{eventTypeOptions.map((option) => (
											<option key={option} value={option}>
												{option}
											</option>
										))}
									</select>
								</Field>
								<Field label="Expected attendance">
									<input
										type="number"
										min="1"
										value={formState.expectedAttendance}
										onChange={updateField("expectedAttendance")}
										placeholder="250"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Event date">
									<input
										type="date"
										value={formState.eventDate}
										onChange={updateField("eventDate")}
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Start time">
									<input
										type="time"
										value={formState.startTime}
										onChange={updateField("startTime")}
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="End time">
									<input
										type="time"
										value={formState.endTime}
										onChange={updateField("endTime")}
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
								<Field label="Venue name">
									<input
										type="text"
										value={formState.venueName}
										onChange={updateField("venueName")}
										placeholder="Main hall or venue name"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
									/>
								</Field>
							</div>

							<Field label="Full address">
								<textarea
									value={formState.fullAddress}
									onChange={updateField("fullAddress")}
									rows={4}
									placeholder="Street, city, province, and landmarks"
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
								/>
							</Field>

							<Field label="Notes" hint="Optional">
								<textarea
									value={formState.notes}
									onChange={updateField("notes")}
									rows={4}
									placeholder="Any special requirements, venue rules, or timelines"
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
								/>
							</Field>

							{submitMessage && (
								<div className={`rounded-3xl p-6 text-sm font-semibold ${
									submitMessage.includes("Error")
										? "border border-red-200 bg-red-50 text-red-700"
										: "border border-emerald-200 bg-emerald-50 text-emerald-700"
								}`}>
									{submitMessage}
								</div>
							)}

							<div className="flex flex-col gap-3 sm:flex-row">
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Submitting..." : "Request a proposal"}
								</Button>
							</div>
						</form>
					</Card>
			</section>
			</main>
		</>
	);
}
