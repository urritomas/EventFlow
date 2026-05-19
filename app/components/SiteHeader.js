"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const themeStorageKey = "eventflow-theme";

// Resolves the actual theme (light/dark) from a mode (light/dark/system)
function resolveTheme(mode) {
	if (mode === "system") {
		return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return mode;
}

// Apply theme to the DOM and persists the mode preference
function setTheme(mode) {
	if (typeof document === "undefined") return;

	const root = document.documentElement;
	const resolvedTheme = resolveTheme(mode);

	root.dataset.theme = resolvedTheme;
	root.dataset.themeMode = mode;
	root.style.colorScheme = resolvedTheme;
	window.localStorage.setItem(themeStorageKey, mode);
}

export default function SiteHeader({ showBack = false }) {
	const [themeMode, setThemeModeState] = useState("system");
	const [isNavigatingHome, setIsNavigatingHome] = useState(false);
	const router = useRouter();

	// Initialize theme from localStorage or system preference, and listen for OS theme changes
	useEffect(() => {
		// Restore the persisted preference or fall back to the system theme
		const savedMode = window.localStorage.getItem(themeStorageKey) || "system";
		setThemeModeState(savedMode);
		setTheme(savedMode);

		// When the user chooses System Default, keep the UI in sync with OS changes
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const currentMode = window.localStorage.getItem(themeStorageKey) || "system";
			if (currentMode === "system") {
				setTheme("system");
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const handleThemeChange = (mode) => {
		setThemeModeState(mode);
		setTheme(mode);
	};

	const handleBack = () => {
		setIsNavigatingHome(true);
		router.push("/");
	};

	return (
		<>
			{isNavigatingHome ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm">
					<div className="flex w-full max-w-md flex-col items-center rounded-4xl border border-white/10 bg-white/8 px-8 py-10 text-center text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
						<div className="relative mb-6 grid h-18 w-18 place-items-center">
							<div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
							<div className="absolute inset-2 animate-spin rounded-full border border-emerald-300/40 border-t-emerald-300" />
							<div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-sm font-semibold text-emerald-200">
								EF
							</div>
						</div>
						<p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">EventFlow</p>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight">Going back to the landing page</h2>
						<p className="mt-3 text-sm leading-7 text-slate-300">Preparing the previous page in the same flow.</p>
					</div>
				</div>
			) : null}
			<header
				className="sticky top-0 z-40 border-b backdrop-blur-xl"
				style={{
					backgroundColor: "var(--header-bg)",
					borderColor: "var(--header-border)",
				}}
			>
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-12">
					<div className="flex items-center gap-3">
						{showBack ? (
							<button
								type="button"
								onClick={handleBack}
								className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-emerald-300/60 hover:bg-white/15"
								style={{
									borderColor: "var(--header-border)",
									backgroundColor: "rgba(255,255,255,0.1)",
									color: "var(--header-fg)",
								}}
							>
								<span aria-hidden="true">←</span>
								Back
							</button>
						) : (
							<Link href="/" className="text-sm font-semibold tracking-[0.24em]" style={{ color: "var(--header-fg)" }}>
								EVENTFLOW
							</Link>
						)}
						<div className="hidden text-xs uppercase tracking-[0.22em] sm:block" style={{ color: "var(--text-muted)" }}>
							Smart attendance platform
						</div>
					</div>

					<div
						className="flex items-center gap-2 rounded-full border p-1"
						style={{
							borderColor: "var(--header-border)",
							backgroundColor: "var(--surface-soft)",
						}}
					>
						<button
							type="button"
							onClick={() => handleThemeChange("light")}
							aria-pressed={themeMode === "light"}
							className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
								themeMode === "light" ? "bg-white shadow-sm" : "hover:text-white"
							}`}
							style={{
								backgroundColor: themeMode === "light" ? "var(--surface-strong)" : "transparent",
								color: themeMode === "light" ? "var(--foreground)" : "var(--text-muted)",
							}}
						>
							Light
						</button>
						<button
							type="button"
							onClick={() => handleThemeChange("dark")}
							aria-pressed={themeMode === "dark"}
							className={`rounded-full px-4 py-2 text-sm font-semibold transition ${themeMode === "dark" ? "bg-slate-950 shadow-sm" : "hover:text-white"}`}
							style={{
								backgroundColor: themeMode === "dark" ? "#020617" : "transparent",
								color: themeMode === "dark" ? "#ffffff" : "var(--text-muted)",
							}}
						>
							Dark
						</button>
						<button
							type="button"
							onClick={() => handleThemeChange("system")}
							aria-pressed={themeMode === "system"}
							className={`rounded-full px-4 py-2 text-sm font-semibold transition ${themeMode === "system" ? "bg-white shadow-sm" : "hover:text-white"}`}
							style={{
								backgroundColor: themeMode === "system" ? "var(--surface-elevated)" : "transparent",
								color: themeMode === "system" ? "var(--foreground)" : "var(--text-muted)",
							}}
						>
							System
						</button>
					</div>
				</div>
			</header>
		</>
	);
}
