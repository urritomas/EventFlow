const OAUTH_NOTICES = {
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

const SIGNUP_SUCCESS =
	"Organization account submitted! An EventFlow admin must approve it before you can sign in.";

/** Read OAuth / registration notices directly from URL params (render-safe). */
export function getOAuthNotice(searchParams) {
	if (!searchParams) return null;

	const error = searchParams.get("error");
	const registered = searchParams.get("registered");

	if (error === "org_account_pending" && registered === "1") {
		return { variant: "success", message: SIGNUP_SUCCESS };
	}

	if (error && OAUTH_NOTICES[error]) {
		const variant =
			error === "org_account_pending"
				? "warning"
				: error === "org_account_rejected" || error === "auth_failed" || error === "no_account"
					? "error"
					: "info";
		return { variant, message: OAUTH_NOTICES[error] };
	}

	return null;
}

export { OAUTH_NOTICES, SIGNUP_SUCCESS };
