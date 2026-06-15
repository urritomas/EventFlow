export const ORG_ACCOUNT_STATUS = {
	PENDING: "pending",
	APPROVED: "approved",
	REJECTED: "rejected",
};

/** Only org accounts explicitly marked approved may sign in. */
export function isOrgLoginAllowed(loginRow) {
	if (!loginRow || loginRow.login_type !== 1) return true;
	return loginRow.account_status === ORG_ACCOUNT_STATUS.APPROVED;
}

export function getOrgBlockMessage(loginRow) {
	if (!loginRow || loginRow.login_type !== 1) return null;
	if (
		!loginRow.account_status ||
		loginRow.account_status === ORG_ACCOUNT_STATUS.PENDING
	) {
		return "Your organization account is pending admin approval. You can sign in once an EventFlow admin approves it.";
	}
	if (loginRow.account_status === ORG_ACCOUNT_STATUS.REJECTED) {
		return "Your organization account was not approved. Contact EventFlow support if you believe this is an error.";
	}
	return null;
}

export function normalizeOrgLoginRow(loginRow) {
	if (!loginRow || loginRow.login_type !== 1) return loginRow;
	if (!loginRow.account_status && loginRow.auth_provider === "google") {
		return { ...loginRow, account_status: ORG_ACCOUNT_STATUS.PENDING };
	}
	return loginRow;
}
