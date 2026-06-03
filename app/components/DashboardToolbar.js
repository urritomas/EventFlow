"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, CalendarDays, Plus, LogOut, SlidersHorizontal, User } from "lucide-react";

export default function DashboardToolbar({
	onSearch = () => {},
	onViewEvents = () => {},
	onCreateEvent = () => {},
	onLogout = () => {},
	onStatusSettings = () => {},
	onProfile = () => {},
}) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e) => {
		e.preventDefault();
		onSearch(searchQuery);
	};

	return (
		<div
			className="sticky top-0 z-20 flex w-full items-center gap-3 border-b px-4 py-2.5 md:px-6"
			style={{
				backgroundColor: "#f8fafc",
				borderColor: "rgba(15,23,42,0.08)",
				backdropFilter: "blur(12px)",
			}}
		>
			{/* Search */}
			<form onSubmit={handleSearch} className="relative">
				<input
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search"
					className="h-9 w-40 md:w-56 rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
				/>
				<button
					type="submit"
					className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 transition hover:bg-slate-100"
				>
					<Search size={16} className="text-slate-500" />
				</button>
			</form>

			{/* Actions */}
			<button
				onClick={onViewEvents}
				className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
			>
				<CalendarDays size={14} />
				View Events
			</button>

			<button
				onClick={onCreateEvent}
				className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
			>
				<Plus size={14} />
				Create Event
			</button>

			<button
				onClick={onLogout}
				className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
			>
				<LogOut size={14} />
				Logout
			</button>

			<button
				onClick={onStatusSettings}
				className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
				title="Status/Settings"
			>
				<SlidersHorizontal size={16} />
			</button>

			<button
				onClick={onProfile}
				className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
				title="Profile"
			>
				<User size={16} />
			</button>
		</div>
	);
}
