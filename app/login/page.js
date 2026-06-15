"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import bcrypt from "bcryptjs";
import { Building2, User, Lock } from "lucide-react";
import { signInWithGoogle } from "@/utils/auth/googleAuth";
import { persistSession, dashboardPathForRole } from "@/utils/auth/session";
import { getOrgBlockMessage } from "@/utils/auth/orgApproval";
import { getOAuthNotice } from "@/utils/auth/notices";
import { AuthNotice } from "../components/AuthNotice";

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

function GoogleButton({ onClick, disabled, label = "Continue with Google" }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
				<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.761 0 5.246 1.127 7.054 2.946l5.657-5.657C34.046 10.846 29.268 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
				<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.761 0 5.246 1.127 7.054 2.946l5.657-5.657C34.046 10.846 29.268 8 24 8 12.955 8 4 16.955 4 28c0 3.591.868 6.979 2.403 9.978l6.571-4.819C11.511 30.342 11 29.214 11 28s.511-2.342 1.403-3.309z" />
				<path fill="#4CAF50" d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 38.977 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z" />
				<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.005 2.947-3.303 5.236-6.197 6.571l6.19 5.238C42.022 35.026 44 31.762 44 28c0-2.761-.672-5.358-1.389-7.917z" />
			</svg>
			{label}
		</button>
	);
}

function LoginModeButton({ mode, label, icon: Icon, isActive, onClick }) {
	return (
		<button
			onClick={onClick}
			className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all duration-300 ${
				isActive
					? "border-emerald-400 bg-emerald-400/15 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
					: "border-white/15 bg-white/6 hover:border-emerald-300/40"
			}`}
		>
			<Icon size={32} className="text-emerald-400" />
			<span className="text-sm font-semibold text-slate-200">{label}</span>
		</button>
	);
}

const OAUTH_ERROR_MESSAGES = {
	wrong_account_type:
		"This email is registered under a different account type. Choose the correct login mode.",
	auth_failed: "Google sign-in failed. Please try again.",
	missing_code: "Sign-in was interrupted. Please try again.",
	no_account: "No account found for this Google email. Please register first.",
	account_exists: "An organization account with this email already exists. Sign in instead.",
	org_account_pending:
		"Your organization account is pending admin approval. You can sign in once an EventFlow admin approves it.",
	org_account_rejected:
		"Your organization account was not approved. Contact EventFlow support if you believe this is an error.",
};

function formMessageVariant(message) {
	if (
		message.includes("Error") ||
		message.includes("Invalid") ||
		message.includes("not approved") ||
		message.includes("No account") ||
		message.includes("pending admin")
	) {
		return "border border-red-200 bg-red-50 text-red-700";
	}
	if (message.includes("submitted") || message.includes("pending")) {
		return "border border-amber-300 bg-amber-50 text-amber-950";
	}
	return "border border-emerald-200 bg-emerald-50 text-emerald-700";
}

function LoginPageInner() {
	const searchParams = useSearchParams();
	const oauthNotice = getOAuthNotice(searchParams);
	const [loginMode, setLoginMode] = useState("organization");
	const [showAdminHint, setShowAdminHint] = useState(false);
	const [adminClicks, setAdminClicks] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const [formState, setFormState] = useState({
		// Organization
		orgEmail: "",
		orgPassword: "",
		// Personal
		personalEmail: "",
		personalPassword: "",
		// Admin
		adminEmail: "",
		adminPassword: "",
		adminCode: "",
	});

	useEffect(() => {
		setIsGoogleLoading(false);

		const oauthError = searchParams.get("error");
		const registered = searchParams.get("registered");
		if (oauthError === "org_account_pending" && registered === "1") {
			setLoginMode("organization");
			setSubmitMessage(
				"Organization account submitted! An EventFlow admin must approve it before you can sign in."
			);
			return;
		}
		if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
			if (oauthError.startsWith("org_")) {
				setLoginMode("organization");
			}
			setSubmitMessage(OAUTH_ERROR_MESSAGES[oauthError]);
		}
	}, [searchParams]);

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

	const handleGoogleSignIn = async () => {
		if (loginMode === "admin") {
			setSubmitMessage("Admin accounts use email and password only.");
			return;
		}

		setIsGoogleLoading(true);
		setSubmitMessage("");
		try {
			await signInWithGoogle(loginMode, "login");
		} catch (error) {
			setSubmitMessage(`Google sign-in error: ${error.message}`);
			setIsGoogleLoading(false);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		setSubmitMessage("");

		try {
			const supabase = createClient();

			if (loginMode === "organization") {
				if (!formState.orgEmail || !formState.orgPassword) {
					setSubmitMessage("Please enter your email and password.");
					setIsSubmitting(false);
					return;
				}

				const { data: loginData, error: loginError } = await supabase
					.from("login_details")
					.select("*")
					.eq("email_address", formState.orgEmail.trim().toLowerCase())
					.eq("login_type", 1);

				if (loginError || !loginData || loginData.length === 0) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				const orgUser = loginData[0];
				const orgBlockMessage = getOrgBlockMessage(orgUser);

				if (!orgUser.hashed_password) {
					setSubmitMessage(
						orgBlockMessage ||
							"This organization account uses Google sign-in. Click Continue with Google."
					);
					setIsSubmitting(false);
					return;
				}

				const passwordMatch = await bcrypt.compare(formState.orgPassword, orgUser.hashed_password);

				if (!passwordMatch) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				const orgBlockMessageAfterPassword = getOrgBlockMessage(orgUser);
				if (orgBlockMessageAfterPassword) {
					setSubmitMessage(orgBlockMessageAfterPassword);
					setIsSubmitting(false);
					return;
				}

				persistSession({
					role: "organization",
					loginId: orgUser.login_id,
					email: orgUser.email_address || "",
					orgName: orgUser.org_name || "",
				});

				setSubmitMessage(`Welcome back, ${orgUser.org_name}! Redirecting to dashboard...`);
				setTimeout(() => {
					window.location.href = dashboardPathForRole("organization");
				}, 1500);
			} else if (loginMode === "personal") {
				if (!formState.personalEmail || !formState.personalPassword) {
					setSubmitMessage("Please enter your email and password.");
					setIsSubmitting(false);
					return;
				}

				const { data: loginData, error: loginError } = await supabase
					.from("login_details")
					.select("*")
					.eq("email_address", formState.personalEmail.trim().toLowerCase())
					.eq("login_type", 2);

				if (loginError || !loginData || loginData.length === 0) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				const personalUser = loginData[0];

				if (!personalUser.hashed_password) {
					setSubmitMessage("This account uses Google sign-in. Click Continue with Google.");
					setIsSubmitting(false);
					return;
				}

				const passwordMatch = await bcrypt.compare(formState.personalPassword, personalUser.hashed_password);

				if (!passwordMatch) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				persistSession({
					role: "personal",
					loginId: personalUser.login_id,
					email: personalUser.email_address || "",
					firstName: personalUser.first_name || "",
					lastName: personalUser.last_name || "",
				});

				setSubmitMessage(`Welcome back, ${personalUser.first_name}! Redirecting to your dashboard...`);
				setTimeout(() => {
					window.location.href = dashboardPathForRole("personal");
				}, 1500);
			} else if (loginMode === "admin") {
				// Admin login
				if (!formState.adminEmail || !formState.adminPassword) {
					setSubmitMessage("Please enter your email and password.");
					setIsSubmitting(false);
					return;
				}

				// Get admin user from login_details with login_type 3 (admin)
				const { data: loginData, error: loginError } = await supabase
					.from("login_details")
					.select("*")
					.eq("email_address", formState.adminEmail)
					.eq("login_type", 3);

				if (loginError || !loginData || loginData.length === 0) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				const adminUser = loginData[0];

				// Verify password using bcrypt
				const passwordMatch = await bcrypt.compare(formState.adminPassword, adminUser.hashed_password);

				if (!passwordMatch) {
					setSubmitMessage("Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				persistSession({ role: "admin", email: adminUser.email_address || "" });
				setSubmitMessage("Admin access verified. Redirecting to admin panel...");
				setTimeout(() => {
					window.location.href = dashboardPathForRole("admin");
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
								icon={Building2}
								isActive={loginMode === "organization"}
								onClick={() => setLoginMode("organization")}
							/>
							<LoginModeButton
								mode="personal"
								label="Personal Login"
								icon={User}
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
										icon={Lock}
										isActive={loginMode === "admin"}
										onClick={() => setLoginMode("admin")}
									/>
								</div>
							)}
						</div>

						<div className="mx-auto mt-8 max-w-4xl text-center">
							<p className="text-sm text-slate-400">
								Don't have an account?{" "}
								<Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
									Create one here
								</Link>
							</p>
						</div>
					</div>
				</section>

				<section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 lg:px-12">
					{oauthNotice ? (
						<div className="mb-6">
							<AuthNotice notice={oauthNotice} />
						</div>
					) : null}
					<Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<form className="space-y-8 p-6 sm:p-8" onSubmit={handleSubmit}>
							{/* Organization Login Form */}
							{loginMode === "organization" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Organization</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Event Manager Access</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Sign in with your organization Google email. New events require admin approval before going live.
										</p>
									</div>

									<GoogleButton
										onClick={handleGoogleSignIn}
										disabled={isSubmitting || isGoogleLoading}
										label={isGoogleLoading ? "Redirecting to Google…" : "Continue with Google"}
									/>

									<div className="relative text-center text-xs uppercase tracking-[0.2em] text-slate-400">
										<span className="relative z-10 bg-white px-3">or sign in with email</span>
										<div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200" />
									</div>

									<Field label="Organization Email">
										<input
											type="email"
											value={formState.orgEmail}
											onChange={updateField("orgEmail")}
											placeholder="name@organization.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

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
											<li>✔ Create and manage multiple events</li>
											<li>✔ Configure RFID, facial recognition, and geofencing</li>
											<li>✔ Real-time attendance dashboard</li>
											<li>✔ Automated certificate generation</li>
										</ul>
									</div>

									{submitMessage && (
										<div className={`rounded-3xl p-6 text-sm font-semibold ${formMessageVariant(submitMessage)}`}>
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
											Sign in to access events and manage your biometrics.
										</p>
									</div>

									<GoogleButton
										onClick={handleGoogleSignIn}
										disabled={isSubmitting || isGoogleLoading}
										label={isGoogleLoading ? "Redirecting to Google…" : "Continue with Google"}
									/>

									<div className="relative text-center text-xs uppercase tracking-[0.2em] text-slate-400">
										<span className="relative z-10 bg-white px-3">or sign in with email</span>
										<div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200" />
									</div>

									<Field label="Email">
										<input
											type="email"
											value={formState.personalEmail}
											onChange={updateField("personalEmail")}
											placeholder="you@example.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

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
											<li>✔ Register your facial biometrics once</li>
											<li>✔ Fast check-in using face recognition</li>
											<li>✔ View your attended events</li>
											<li>✔ Download certificates automatically</li>
										</ul>
									</div>

									{submitMessage && (
										<div className={`rounded-3xl p-6 text-sm font-semibold ${formMessageVariant(submitMessage)}`}>
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
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Admin</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Developer Portal</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Review and approve event requests from organizations.
										</p>
									</div>

									<Field label="Admin Email">
										<input
											type="email"
											value={formState.adminEmail}
											onChange={updateField("adminEmail")}
											placeholder="admin@eventflow.dev"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<Field label="Password">
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
											<li>✔ Review pending event requests</li>
											<li>✔ Approve or reject event setups</li>
											<li>✔ Monitor system health</li>
											<li>✔ Manage organization accounts</li>
										</ul>
									</div>

									{submitMessage && (
										<div className={`rounded-3xl p-6 text-sm font-semibold ${formMessageVariant(submitMessage)}`}>
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

export default function LoginPage() {
	return (
		<Suspense fallback={null}>
			<LoginPageInner />
		</Suspense>
	);
}
