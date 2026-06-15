import { NextResponse } from "next/server";
import { isOrgLoginAllowed, normalizeOrgLoginRow } from "@/utils/auth/orgApproval";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const LOGIN_TYPE = {
	organization: 1,
	personal: 2,
};

function loginRedirect(origin, params) {
	const url = new URL("/login", origin);
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	}
	return NextResponse.redirect(url.toString());
}

function completeRedirect(origin, params) {
	const url = new URL("/auth/complete", origin);
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	}
	return NextResponse.redirect(url.toString());
}

async function signOutSupabase(supabaseAuth) {
	try {
		await supabaseAuth.auth.signOut();
	} catch {
		// Best-effort — local app session is not created when login is blocked.
	}
}

async function uniqueUsername(supabaseAdmin, email) {
	const usernameBase = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
	let username = usernameBase;
	let suffix = 1;

	while (true) {
		const { data: taken } = await supabaseAdmin
			.from("login_details")
			.select("login_id")
			.eq("username", username)
			.limit(1);
		if (!taken?.length) return username;
		username = `${usernameBase}_${suffix}`;
		suffix += 1;
	}
}

async function createGoogleAccount(supabaseAdmin, { email, role, firstName, lastName, fullName, userMetadata }) {
	const username = await uniqueUsername(supabaseAdmin, email);
	const isOrg = role === "organization";

	const row = {
		username,
		email_address: email,
		hashed_password: null,
		login_type: LOGIN_TYPE[role],
		auth_provider: "google",
	};

	if (isOrg) {
		row.org_name =
			userMetadata?.organization ||
			userMetadata?.company ||
			fullName ||
			email.split("@")[0];
		row.account_status = "pending";
	} else {
		row.first_name = firstName || null;
		row.last_name = lastName || null;
	}

	let { data: created, error: createError } = await supabaseAdmin
		.from("login_details")
		.insert([row])
		.select()
		.single();

	if (createError?.message?.includes("auth_provider")) {
		delete row.auth_provider;
		({ data: created, error: createError } = await supabaseAdmin
			.from("login_details")
			.insert([row])
			.select()
			.single());
	}

	if (createError) {
		console.error(`[Google OAuth] Create ${role} account error:`, createError);
		return null;
	}

	if (isOrg && created && !created.account_status) {
		created.account_status = "pending";
	}

	return created;
}

function orgBlockedRedirect(origin, loginRow, { justCreated = false, isSignup = false } = {}) {
	const params = {
		error:
			loginRow.account_status === "rejected" ? "org_account_rejected" : "org_account_pending",
	};
	if (justCreated || isSignup) {
		params.registered = "1";
	}
	return loginRedirect(origin, params);
}

export async function GET(request) {
	let supabaseAuth;

	try {
		const { searchParams, origin } = new URL(request.url);
		const code = searchParams.get("code");
		const role = searchParams.get("role") || "personal";
		const mode = searchParams.get("mode") || "login";
		const isSignup = mode === "signup";

		if (!code) {
			return loginRedirect(origin, { error: "missing_code" });
		}

		const cookieStore = await cookies();
		supabaseAuth = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options)
							);
						} catch {
							// Cookie writes can fail in some server contexts.
						}
					},
				},
			}
		);

		const { data: sessionData, error: sessionError } =
			await supabaseAuth.auth.exchangeCodeForSession(code);

		if (sessionError || !sessionData?.user) {
			console.error("[Google OAuth] Session error:", sessionError);
			return loginRedirect(origin, { error: "auth_failed" });
		}

		const user = sessionData.user;
		const email = user.email?.toLowerCase().trim();
		if (!email) {
			await signOutSupabase(supabaseAuth);
			return loginRedirect(origin, { error: "auth_failed" });
		}

		const fullName =
			user.user_metadata?.full_name || user.user_metadata?.name || "";
		const firstName = fullName.split(" ")[0] || "";
		const lastName = fullName.split(" ").slice(1).join(" ") || "";

		const supabaseAdmin = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.SUPABASE_SERVICE_ROLE_KEY
		);

		const expectedLoginType = LOGIN_TYPE[role];
		if (!expectedLoginType) {
			await signOutSupabase(supabaseAuth);
			return loginRedirect(origin, { error: "auth_failed" });
		}

		const { data: existingByEmail } = await supabaseAdmin
			.from("login_details")
			.select("*")
			.eq("email_address", email);

		let loginRow = existingByEmail?.find((row) => row.login_type === expectedLoginType);
		let justCreated = false;

		if (!loginRow) {
			if (!isSignup) {
				await signOutSupabase(supabaseAuth);
				return loginRedirect(origin, { error: "no_account" });
			}

			const otherType = existingByEmail?.find(
				(row) => row.login_type !== expectedLoginType
			);
			if (otherType) {
				await signOutSupabase(supabaseAuth);
				return loginRedirect(origin, { error: "wrong_account_type" });
			}

			loginRow = await createGoogleAccount(supabaseAdmin, {
				email,
				role,
				firstName,
				lastName,
				fullName,
				userMetadata: user.user_metadata,
			});

			if (!loginRow) {
				await signOutSupabase(supabaseAuth);
				return loginRedirect(origin, { error: "auth_failed" });
			}
			justCreated = true;
		} else if (isSignup && role === "organization") {
			await signOutSupabase(supabaseAuth);
			if (isOrgLoginAllowed(normalizeOrgLoginRow(loginRow))) {
				return loginRedirect(origin, { error: "account_exists" });
			}
			return orgBlockedRedirect(origin, normalizeOrgLoginRow(loginRow), { isSignup: true });
		}

		loginRow = normalizeOrgLoginRow(loginRow);

		if (loginRow.login_type === LOGIN_TYPE.organization && !isOrgLoginAllowed(loginRow)) {
			await signOutSupabase(supabaseAuth);
			return orgBlockedRedirect(origin, loginRow, { justCreated, isSignup });
		}

		const sessionRole =
			loginRow.login_type === LOGIN_TYPE.organization
				? "organization"
				: loginRow.login_type === LOGIN_TYPE.personal
					? "personal"
					: "admin";

		return completeRedirect(origin, {
			role: sessionRole,
			loginId: loginRow.login_id,
			email: loginRow.email_address || email,
			firstName: loginRow.first_name || firstName,
			lastName: loginRow.last_name || lastName,
			orgName: loginRow.org_name || "",
		});
	} catch (error) {
		console.error("[Google OAuth] Unhandled callback error:", error);
		if (supabaseAuth) {
			await signOutSupabase(supabaseAuth);
		}
		const origin = new URL(request.url).origin;
		return loginRedirect(origin, { error: "auth_failed" });
	}
}
