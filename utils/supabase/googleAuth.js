import { createClient } from "@/utils/supabase/client";

export async function signInWithGoogle(role = "personal") {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw error;
}