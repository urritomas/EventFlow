export default function Loading() {
	return (
		<main
			className="loading-screen themed-screen min-h-screen overflow-hidden text-white"
			style={{
				background:
					"radial-gradient(circle at top left, rgba(16, 185, 129, 0.2), transparent 28%), radial-gradient(circle at top right, rgba(202, 138, 4, 0.16), transparent 24%), linear-gradient(180deg, var(--hero-top) 0%, var(--hero-mid) 34%, var(--page-bg-soft) 34%, var(--page-bg) 100%)",
			}}
		>
			<section className="relative flex min-h-screen items-center justify-center px-6">
				<div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[64px_64px] opacity-35" />
				<div className="relative flex w-full max-w-xl flex-col items-center rounded-4xl border border-white/10 bg-white/8 px-8 py-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:px-10">
					<div className="relative mb-8 grid h-20 w-20 place-items-center">
						<div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
						<div className="absolute inset-2 animate-spin rounded-full border border-emerald-300/40 border-t-emerald-300" />
						<div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-sm font-semibold text-emerald-200">
							EF
						</div>
					</div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">EventFlow</p>
					<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
						Loading your next step
					</h1>
					<p className="mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
						Preparing the hiring details page and keeping your event workflow in sync.
					</p>
				</div>
			</section>
		</main>
	);
}