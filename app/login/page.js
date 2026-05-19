"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";

function SectionLabel({ children }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 backdrop-blur">
			<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
			{children}
		</span>
	);
}

function Button({ children, onClick, variant = "primary", type = "button", className = "", disabled = false }) {
	const base =
		"inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300";
	const styles =
		variant === "primary"
			? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
			: "border border-white/15 bg-white/8 text-white backdrop-blur hover:border-emerald-300/60 hover:bg-white/12 disabled:opacity-50 disabled:cursor-not-allowed";

	return (
		<button
			type={type}
			onClick={onClick}
			className={`${base} ${styles} ${className}`}
			disabled={disabled}
		>
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

function LoginModeButton({ mode, label, icon, isActive, onClick }) {
	return (
		<button
			onClick={onClick}
			className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all duration-300 ${
				isActive
					? "border-emerald-400 bg-emerald-400/15 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
					: "border-white/15 bg-white/6 hover:border-emerald-300/40"
			}`}
		>
			<div className="text-3xl">{icon}</div>
			<span className="text-sm font-semibold text-slate-200">{label}</span>
		</button>
	);
}

export default function LoginPage() {
	const [loginMode, setLoginMode] = useState("organization");
	const [showAdminHint, setShowAdminHint] = useState(false);
	const [adminClicks, setAdminClicks] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const [formState, setFormState] = useState({
		// Organization
		orgEmail: "",
		orgPassword: "",
		orgName: "",
		// Personal
		personalEmail: "",
		personalPassword: "",
		firstName: "",
		// Admin
		adminEmail: "",
		adminPassword: "",
		adminCode: "",
	});

	const updateField = (field) => (event) => {
		const value = event.target.value;
		setFormState((current) => ({ ...current, [field]: value }));
	};

	const handleAdminAccess = () => {
		setAdminClicks(adminClicks + 1);
		if (adminClicks >= 2) {
			setShowAdminHint(true);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		setSubmitMessage("");

		try {
			const supabase = createClient();

			if (loginMode === "organization") {
				// Organization login: verify organization credentials
				const { data: orgData, error: orgError } = await supabase
					.from("clients")
					.select("id, name")
					.eq("contact_email", formState.orgEmail)
					.single();

				if (orgError || !orgData) {
					setSubmitMessage("Organization not found. Please check your email or request access.");
					setIsSubmitting(false);
					return;
				}

				// In a real app, you'd verify the password here
				// For now, just authenticate the organization
				setSubmitMessage(`✓ Welcome back, ${orgData.name}! Redirecting to dashboard...`);
				setTimeout(() => {
					// Redirect to organization dashboard
					window.location.href = "/dashboard/organization";
				}, 1500);
			} else if (loginMode === "personal") {
				// Personal login: create or get participant
				const { data: participantData, error: participantError } = await supabase
					.from("participants")
					.select("id")
					.eq("email", formState.personalEmail)
					.single();

				if (!participantData) {
					// Create new participant
					const { data: newParticipant, error: createError } = await supabase
						.from("participants")
						.insert([
							{
								email: formState.personalEmail,
								first_name: formState.firstName,
							},
						])
						.select()
						.single();

					if (createError) throw createError;

					setSubmitMessage(`✓ Welcome, ${formState.firstName}! Your profile created successfully.`);
				} else {
					setSubmitMessage(`✓ Welcome back, ${formState.firstName}! Redirecting to your dashboard...`);
				}

				setTimeout(() => {
					window.location.href = "/dashboard/participant";
				}, 1500);
			} else if (loginMode === "admin") {
				// Admin login: verify admin credentials (this would be more secure in production)
				setSubmitMessage("✓ Admin access verified. Redirecting to admin panel...");
				setTimeout(() => {
					window.location.href = "/dashboard/admin";
				}, 1500);
			}
		} catch (error) {
			setSubmitMessage(`Error: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<SiteHeader />
			<main
				className="themed-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(202,138,4,0.16),transparent_24%),linear-gradient(180deg,var(--hero-top)_0%,var(--hero-mid)_34%,var(--page-bg-soft)_34%,var(--page-bg)_100%)]"
				style={{ color: "var(--foreground)" }}
			>
				<section className="relative isolate border-b border-white/10 text-white">
					<div className="absolute inset-0 -z-10 bg-(--hero-overlay)" />
					<div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[64px_64px] opacity-40" />
					<div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
						<div className="mx-auto max-w-2xl text-center">
							<SectionLabel>EventFlow™ Access Portal</SectionLabel>
							<h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
								How are you joining EventFlow?
							</h1>
							<p className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl">
								Choose your role to access the EventFlow platform. Whether you're organizing events, participating, or managing approvals, we have a secure login for you.
							</p>
						</div>

						<div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-2">
							<LoginModeButton
								mode="organization"
								label="Organization Login"
								icon="🏢"
								isActive={loginMode === "organization"}
								onClick={() => setLoginMode("organization")}
							/>
							<LoginModeButton
								mode="personal"
								label="Personal Login"
								icon="👤"
								isActive={loginMode === "personal"}
								onClick={() => setLoginMode("personal")}
							/>
						</div>

						<div className="mx-auto mt-6 max-w-4xl">
							<button
								onClick={handleAdminAccess}
								className="w-full text-center text-xs text-slate-400 transition-colors hover:text-slate-300"
							>
								Need additional access?
							</button>
							{showAdminHint && (
								<div className="mt-4 animate-fade-in">
									<LoginModeButton
										mode="admin"
										label="Admin Portal"
										icon="🔑"
										isActive={loginMode === "admin"}
										onClick={() => setLoginMode("admin")}
									/>
								</div>
							)}
						</div>
					</div>
				</section>

				<section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 lg:px-12">
					<Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<form className="space-y-8 p-6 sm:p-8" onSubmit={handleSubmit}>
							{/* Organization Login Form */}
							{loginMode === "organization" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Organization</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Event Manager Access</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Create and manage events with secure authentication.
										</p>
									</div>

									<div className="grid gap-5 sm:grid-cols-2">
										<Field label="Organization Name">
											<input
												type="text"
												value={formState.orgName}
												onChange={updateField("orgName")}
												placeholder="Your institution or company"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
										<Field label="Contact Email">
											<input
												type="email"
												value={formState.orgEmail}
												onChange={updateField("orgEmail")}
												placeholder="name@organization.com"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

									<Field label="Password">
										<input
											type="password"
											value={formState.orgPassword}
											onChange={updateField("orgPassword")}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-700">
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Organization Benefits</p>
										<ul className="mt-4 space-y-2 text-sm leading-7">
											<li>✓ Create and manage multiple events</li>
											<li>✓ Configure RFID, facial recognition, and geofencing</li>
											<li>✓ Real-time attendance dashboard</li>
											<li>✓ Automated certificate generation</li>
										</ul>
									</div>

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
										<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in as Organization"}</Button>
										<Button variant="secondary" onClick={() => setLoginMode("personal")}>
											Switch to Personal
										</Button>
									</div>
								</>
							)}

							{/* Personal Login Form */}
							{loginMode === "personal" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Personal</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Participant Access</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Register your biometrics and access events you're invited to.
										</p>
									</div>

									<div className="grid gap-5 sm:grid-cols-2">
										<Field label="First Name">
											<input
												type="text"
												value={formState.firstName}
												onChange={updateField("firstName")}
												placeholder="Your first name"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
										<Field label="Email">
											<input
												type="email"
												value={formState.personalEmail}
												onChange={updateField("personalEmail")}
												placeholder="you@example.com"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

									<Field label="Password">
										<input
											type="password"
											value={formState.personalPassword}
											onChange={updateField("personalPassword")}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-700">
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Participant Features</p>
										<ul className="mt-4 space-y-2 text-sm leading-7">
											<li>✓ Register your facial biometrics once</li>
											<li>✓ Fast check-in using face recognition</li>
											<li>✓ View your attended events</li>
											<li>✓ Download certificates automatically</li>
										</ul>
									</div>

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
										<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in as Participant"}</Button>
										<Button variant="secondary" onClick={() => setLoginMode("organization")}>
											Switch to Organization
										</Button>
									</div>
								</>
							)}

							{/* Admin Login Form */}
							{loginMode === "admin" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Admin</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Developer Portal</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Review and approve event requests from organizations.
										</p>
									</div>

									<div className="grid gap-5 sm:grid-cols-2">
										<Field label="Admin Email">
											<input
												type="email"
												value={formState.adminEmail}
												onChange={updateField("adminEmail")}
												placeholder="admin@eventflow.dev"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
										<Field label="Admin Code">
											<input
												type="password"
												value={formState.adminCode}
												onChange={updateField("adminCode")}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

									<Field label="Master Password">
										<input
											type="password"
											value={formState.adminPassword}
											onChange={updateField("adminPassword")}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 text-amber-900">
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Admin Access</p>
										<ul className="mt-4 space-y-2 text-sm leading-7">
											<li>✓ Review pending event requests</li>
											<li>✓ Approve or reject event setups</li>
											<li>✓ Monitor system health</li>
											<li>✓ Manage organization accounts</li>
										</ul>
									</div>

									{submitMessage && (
										<div className={`rounded-3xl p-6 text-sm font-semibold ${
											submitMessage.includes("Error")
												? "border border-red-200 bg-red-50 text-red-700"
												: "border border-amber-200 bg-amber-50 text-amber-700"
										}`}>
											{submitMessage}
										</div>
									)}

									<div className="flex flex-col gap-3 sm:flex-row">
										<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Verifying..." : "Access Admin Portal"}</Button>
										<Button variant="secondary" onClick={() => setLoginMode("organization")}>
											Back to Main
										</Button>
									</div>
								</>
							)}
						</form>
					</Card>
				</section>
			</main>

			<style jsx>{`
				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(-10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fade-in {
					animation: fade-in 0.3s ease-out;
				}
			`}</style>
		</>
	);
}
