/** Persist EventFlow session to localStorage (used after password or Google login). */
export function persistSession({ role, loginId, email, firstName, lastName, orgName }) {
	localStorage.setItem("isLoggedIn", "true");
	localStorage.setItem("userRole", role);

	if (loginId != null) {
		localStorage.setItem("loginId", String(loginId));
	}
	if (email) {
		localStorage.setItem("email", email);
	}
	if (firstName) {
		localStorage.setItem("firstName", firstName);
	}
	if (lastName) {
		localStorage.setItem("lastName", lastName);
	}
	if (orgName) {
		localStorage.setItem("orgName", orgName);
	}
}

export function clearSession() {
	localStorage.removeItem("isLoggedIn");
	localStorage.removeItem("userRole");
	localStorage.removeItem("loginId");
	localStorage.removeItem("email");
	localStorage.removeItem("firstName");
	localStorage.removeItem("lastName");
	localStorage.removeItem("orgName");
}

export function dashboardPathForRole(role) {
	if (role === "organization") return "/orgDashboard";
	if (role === "admin") return "/adminDashboard";
	return "/personalDashboard";
}
