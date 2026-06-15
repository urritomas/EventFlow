"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SiteHeader from "../components/SiteHeader";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { signInWithGoogle } from "@/utils/auth/googleAuth";
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

function RegisterModeButton({ mode, label, icon, isActive, onClick }) {
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

export default function RegisterPage() {
	const [registerMode, setRegisterMode] = useState("organization");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const [formState, setFormState] = useState({
		// Organization
		orgName: "",
		orgEmail: "",
		orgUsername: "",
		orgPassword: "",
		orgConfirmPassword: "",
		// Personal
		firstName: "",
		lastName: "",
		personalEmail: "",
		personalUsername: "",
		personalPassword: "",
		personalConfirmPassword: "",
	});

	const updateField = (field) => (event) => {
		const value = event.target.value;
		setFormState((current) => ({ ...current, [field]: value }));
	};

	const validateEmail = (email) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const validatePassword = (password) => {
		return password.length >= 8;
	};

	const handleGoogleSignUp = async () => {
		setIsGoogleLoading(true);
		setSubmitMessage("");
		try {
			await signInWithGoogle(registerMode, "signup");
		} catch (error) {
			setSubmitMessage(`Google sign-up error: ${error.message}`);
			setIsGoogleLoading(false);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		setSubmitMessage("");

		try {
			const supabase = createClient();

			if (registerMode === "organization") {
				// Validate form
				if (!formState.orgUsername || !formState.orgEmail || !formState.orgPassword || !formState.orgName) {
					setSubmitMessage("Please fill in all required fields.");
					setIsSubmitting(false);
					return;
				}

				if (!validateEmail(formState.orgEmail)) {
					setSubmitMessage("Please enter a valid email address.");
					setIsSubmitting(false);
					return;
				}

				if (!validatePassword(formState.orgPassword)) {
					setSubmitMessage("Password must be at least 8 characters long.");
					setIsSubmitting(false);
					return;
				}

				if (formState.orgPassword !== formState.orgConfirmPassword) {
					setSubmitMessage("Passwords do not match.");
					setIsSubmitting(false);
					return;
				}

				// Check if email already exists
				const { data: existingEmailData, error: emailError } = await supabase
					.from("login_details")
					.select("login_id", { count: "exact" })
					.eq("email_address", formState.orgEmail);

				if (!emailError && existingEmailData && existingEmailData.length > 0) {
					setSubmitMessage("This email is already registered. Please use a different email or login.");
					setIsSubmitting(false);
					return;
				}

				// Check if username already exists
				const { data: existingUsernameData, error: usernameError } = await supabase
					.from("login_details")
					.select("login_id", { count: "exact" })
					.eq("username", formState.orgUsername);

				if (!usernameError && existingUsernameData && existingUsernameData.length > 0) {
					setSubmitMessage("This username is already taken. Please choose a different username.");
					setIsSubmitting(false);
					return;
				}

				// Hash password
				const hashedPassword = await bcrypt.hash(formState.orgPassword, 10);

				// Create login record (pending until admin approves)
				const { data: loginData, error: loginError } = await supabase
					.from("login_details")
					.insert([
						{
							username: formState.orgUsername,
							email_address: formState.orgEmail.trim().toLowerCase(),
							hashed_password: hashedPassword,
							org_name: formState.orgName,
							login_type: 1,
							account_status: "pending",
						},
					])
					.select()
					.single();

				if (loginError || !loginData) {
					console.error("Organization Registration error:", {
						error: loginError,
						data: loginData,
						message: loginError?.message,
						code: loginError?.code,
					});
					setSubmitMessage(loginError?.message || "Error creating account. Please try again.");
					setIsSubmitting(false);
					return;
				}

				setSubmitMessage(
					"Organization account submitted! An EventFlow admin must approve it before you can sign in. Redirecting to login..."
				);
				setTimeout(() => {
					window.location.href = "/login";
				}, 1500);
			} else if (registerMode === "personal") {
				// Validate form
				if (!formState.personalUsername || !formState.personalEmail || !formState.personalPassword || !formState.firstName) {
					setSubmitMessage("Please fill in all required fields.");
					setIsSubmitting(false);
					return;
				}

				if (!validateEmail(formState.personalEmail)) {
					setSubmitMessage("Please enter a valid email address.");
					setIsSubmitting(false);
					return;
				}

				if (!validatePassword(formState.personalPassword)) {
					setSubmitMessage("Password must be at least 8 characters long.");
					setIsSubmitting(false);
					return;
				}

				if (formState.personalPassword !== formState.personalConfirmPassword) {
					setSubmitMessage("Passwords do not match.");
					setIsSubmitting(false);
					return;
				}

				// Check if email already exists
				const { data: existingEmailData, error: emailError } = await supabase
					.from("login_details")
					.select("login_id", { count: "exact" })
					.eq("email_address", formState.personalEmail);

				if (!emailError && existingEmailData && existingEmailData.length > 0) {
					setSubmitMessage("This email is already registered. Please use a different email or login.");
					setIsSubmitting(false);
					return;
				}

				// Check if username already exists
				const { data: existingUsernameData, error: usernameError } = await supabase
					.from("login_details")
					.select("login_id", { count: "exact" })
					.eq("username", formState.personalUsername);

				if (!usernameError && existingUsernameData && existingUsernameData.length > 0) {
					setSubmitMessage("This username is already taken. Please choose a different username.");
					setIsSubmitting(false);
					return;
				}

				// Hash password
				const hashedPassword = await bcrypt.hash(formState.personalPassword, 10);

				// Create login record
				const { data: loginData, error: loginError } = await supabase
					.from("login_details")
					.insert([
						{
							username: formState.personalUsername,
							email_address: formState.personalEmail,
							hashed_password: hashedPassword,
							first_name: formState.firstName,
							last_name: formState.lastName || null,
							login_type: 2, // 2 for personal
						},
					])
					.select()
					.single();

				if (loginError || !loginData) {
					console.error("Personal Registration error:", {
						error: loginError,
						data: loginData,
						message: loginError?.message,
						code: loginError?.code,
					});
					setSubmitMessage(loginError?.message || "Error creating account. Please try again.");
					setIsSubmitting(false);
					return;
				}

				setSubmitMessage("✓ Personal account created successfully! Redirecting to login...");
				setTimeout(() => {
					window.location.href = "/login";
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
							<SectionLabel>EventFlow™ Registration</SectionLabel>
							<h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
								Create Your EventFlow Account
							</h1>
							<p className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl">
								Register to start managing events or participating in EventFlow. Choose your account type to get started.
							</p>
						</div>

						<div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-2">
							<RegisterModeButton
								mode="organization"
								label="Organization Registration"
								icon="🏢"
								isActive={registerMode === "organization"}
								onClick={() => setRegisterMode("organization")}
							/>
							<RegisterModeButton
								mode="personal"
								label="Personal Registration"
								icon="👤"
								isActive={registerMode === "personal"}
								onClick={() => setRegisterMode("personal")}
							/>
						</div>

						<div className="mx-auto mt-6 max-w-4xl text-center">
							<p className="text-sm text-slate-400">
								Already have an account?{" "}
								<Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
									Sign in here
								</Link>
							</p>
						</div>
					</div>
				</section>

				<section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 lg:px-12">
					<Card className="border-slate-200 bg-white p-0 shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
						<form className="space-y-8 p-6 sm:p-8" onSubmit={handleSubmit}>
							{/* Organization Registration Form */}
							{registerMode === "organization" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Organization</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Create Organization Account</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Register your organization to start creating and managing events on EventFlow.
										</p>
									</div>

									<div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
										Organization accounts require admin approval before you can sign in. After approval, you can use Google or email/password. Events you create also need separate admin approval.
									</div>

									<GoogleButton
										onClick={handleGoogleSignUp}
										disabled={isSubmitting || isGoogleLoading}
										label={isGoogleLoading ? "Redirecting to Google…" : "Sign up with Google"}
									/>

									<div className="relative text-center text-xs uppercase tracking-[0.2em] text-slate-400">
										<span className="relative z-10 bg-white px-3">or register with email</span>
										<div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200" />
									</div>

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

									<Field label="Username" hint="For login">
										<input
											type="text"
											value={formState.orgUsername}
											onChange={updateField("orgUsername")}
											placeholder="Choose a unique username"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<div className="grid gap-5 sm:grid-cols-2">
										<Field label="Password" hint="Min. 8 characters">
											<input
												type="password"
												value={formState.orgPassword}
												onChange={updateField("orgPassword")}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
										<Field label="Confirm Password">
											<input
												type="password"
												value={formState.orgConfirmPassword}
												onChange={updateField("orgConfirmPassword")}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

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
											submitMessage.includes("Error") || submitMessage.includes("Please") || submitMessage.includes("already")
												? "border border-red-200 bg-red-50 text-red-700"
												: "border border-emerald-200 bg-emerald-50 text-emerald-700"
										}`}>
											{submitMessage}
										</div>
									)}

									<div className="flex flex-col gap-3 sm:flex-row">
										<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating Account..." : "Create Organization Account"}</Button>
										<Button variant="secondary" onClick={() => setRegisterMode("personal")}>
											Switch to Personal
										</Button>
									</div>
								</>
							)}

							{/* Personal Registration Form */}
							{registerMode === "personal" && (
								<>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Personal</p>
										<h3 className="mt-3 text-2xl font-semibold text-slate-950">Create Personal Account</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											Register as a participant to attend events and register your biometrics.
										</p>
									</div>

									<GoogleButton
										onClick={handleGoogleSignUp}
										disabled={isSubmitting || isGoogleLoading}
										label={isGoogleLoading ? "Redirecting to Google…" : "Sign up with Google"}
									/>

									<div className="relative text-center text-xs uppercase tracking-[0.2em] text-slate-400">
										<span className="relative z-10 bg-white px-3">or register with email</span>
										<div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200" />
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
										<Field label="Last Name">
											<input
												type="text"
												value={formState.lastName}
												onChange={updateField("lastName")}
												placeholder="Your last name"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

									<Field label="Email Address">
										<input
											type="email"
											value={formState.personalEmail}
											onChange={updateField("personalEmail")}
											placeholder="you@example.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<Field label="Username" hint="For login">
										<input
											type="text"
											value={formState.personalUsername}
											onChange={updateField("personalUsername")}
											placeholder="Choose a unique username"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
										/>
									</Field>

									<div className="grid gap-5 sm:grid-cols-2">
										<Field label="Password" hint="Min. 8 characters">
											<input
												type="password"
												value={formState.personalPassword}
												onChange={updateField("personalPassword")}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
										<Field label="Confirm Password">
											<input
												type="password"
												value={formState.personalConfirmPassword}
												onChange={updateField("personalConfirmPassword")}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
											/>
										</Field>
									</div>

									<div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-700">
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Participant Features</p>
										<ul className="mt-4 space-y-2 text-sm leading-7">
											<li>✓ Register your facial biometrics</li>
											<li>✓ Fast check-in using face recognition</li>
											<li>✓ View your attended events</li>
											<li>✓ Download certificates automatically</li>
										</ul>
									</div>

									{submitMessage && (
										<div className={`rounded-3xl p-6 text-sm font-semibold ${
											submitMessage.includes("Error") || submitMessage.includes("Please") || submitMessage.includes("already")
												? "border border-red-200 bg-red-50 text-red-700"
												: "border border-emerald-200 bg-emerald-50 text-emerald-700"
										}`}>
											{submitMessage}
										</div>
									)}

									<div className="flex flex-col gap-3 sm:flex-row">
										<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating Account..." : "Create Personal Account"}</Button>
										<Button variant="secondary" onClick={() => setRegisterMode("organization")}>
											Switch to Organization
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
