function AuthNotice({ notice }) {
	if (!notice?.message) return null;

	const styles = {
		success: "border-amber-300 bg-amber-50 text-amber-950",
		warning: "border-amber-400 bg-amber-50 text-amber-950",
		error: "border-red-300 bg-red-50 text-red-800",
		info: "border-sky-300 bg-sky-50 text-sky-900",
	};

	return (
		<div
			role="alert"
			className={`rounded-2xl border-2 px-5 py-4 text-sm font-semibold leading-6 shadow-sm ${styles[notice.variant] || styles.info}`}
		>
			{notice.message}
		</div>
	);
}

export { AuthNotice };
export default AuthNotice;
