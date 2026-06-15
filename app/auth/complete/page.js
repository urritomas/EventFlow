"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { persistSession, dashboardPathForRole } from "@/utils/auth/session";

function AuthCompleteInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [message, setMessage] = useState("Completing sign-in…");

	useEffect(() => {
		const error = searchParams.get("error");
		if (error) {
			const messages = {
				wrong_account_type:
					"This Google email is registered under a different account type.",
				auth_failed: "Google sign-in failed. Please try again.",
				missing_code: "Sign-in was interrupted. Please try again.",
			};
			setMessage(messages[error] || "Sign-in failed. Please try again.");
			setTimeout(() => router.replace(`/login?error=${error}`), 2500);
			return;
		}

		const role = searchParams.get("role");
		if (!role) {
			setMessage("Invalid session. Redirecting to login…");
			setTimeout(() => router.replace("/login"), 1500);
			return;
		}

		persistSession({
			role,
			loginId: searchParams.get("loginId"),
			email: searchParams.get("email") || "",
			firstName: searchParams.get("firstName") || "",
			lastName: searchParams.get("lastName") || "",
			orgName: searchParams.get("orgName") || "",
		});

		setMessage("Signed in! Redirecting…");
		setTimeout(() => router.replace(dashboardPathForRole(role)), 800);
	}, [router, searchParams]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
			<p className="text-lg text-slate-200">{message}</p>
		</main>
	);
}

export default function AuthCompletePage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
					<p className="text-lg text-slate-200">Completing sign-in…</p>
				</main>
			}
		>
			<AuthCompleteInner />
		</Suspense>
	);
}
