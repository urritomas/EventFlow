import { createClient } from "@/utils/supabase/client";

const LOGIN_TYPE = {
	organization: 1,
	personal: 2,
};

/**
 * @param {"organization" | "personal"} role
 * @param {"login" | "signup"} mode — signup creates accounts; login requires an existing approved account
 */
export async function signInWithGoogle(role, mode = "login") {
	const supabase = createClient();
	const origin = window.location.origin;
	const redirectTo = `${origin}/api/auth/callback?role=${role}&mode=${mode}`;

	const { error } = await supabase.auth.signInWithOAuth({
		provider: "google",
		options: {
			redirectTo,
			queryParams: {
				access_type: "online",
				prompt: "select_account",
			},
		},
	});

	if (error) {
		throw error;
	}
}

export { LOGIN_TYPE };
