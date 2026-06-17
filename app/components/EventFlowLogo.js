"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

function getResolvedTheme() {
	if (typeof document === "undefined") return "light";

	const mode = document.documentElement.dataset.themeMode || "light";
	const resolved = document.documentElement.dataset.theme;

	if (resolved === "dark" || resolved === "light") return resolved;
	return mode === "dark" ? "dark" : "light";
}

export default function EventFlowLogo({
	alt = "EventFlow logo",
	className = "",
	logoClassName = "h-8 w-32",
	showText = false,
	sizes = "(max-width: 640px) 48px, 128px",
	text = "EVENTFLOW",
	textClassName = "text-sm font-semibold tracking-[0.18em]",
}) {
	const [theme, setTheme] = useState(getResolvedTheme);

	useEffect(() => {
		const updateTheme = () => setTheme(getResolvedTheme());

		updateTheme();

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const observer = new MutationObserver(updateTheme);

		mediaQuery.addEventListener("change", updateTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme", "data-theme-mode", "data-themeMode"],
		});

		return () => {
			mediaQuery.removeEventListener("change", updateTheme);
			observer.disconnect();
		};
	}, []);

	const src = theme === "dark" ? "/eventflowLogo_DarkMode.png" : "/eventflowLogo.png";

	return (
		<span className={`inline-flex items-center gap-2 ${className}`}>
			<span className={`relative shrink-0 ${logoClassName}`}>
				<Image src={src} alt={alt} fill className="object-contain" sizes={sizes} priority />
			</span>
			{showText ? <span className={textClassName}>{text}</span> : null}
		</span>
	);
}
