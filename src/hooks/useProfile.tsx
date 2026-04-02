import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  display_name: string;
  avatar_url: string;
  diamonds: number;
  bio: string;
  frame: string;
  badges: string[];
}

export const useProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, diamonds, bio, frame, badges")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile({
        display_name: data.display_name ?? "",
        avatar_url: data.avatar_url ?? "",
        diamonds: data.diamonds ?? 0,
        bio: data.bio ?? "",
        frame: data.frame ?? "default",
        badges: data.badges ?? [],
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, refetchProfile: fetchProfile };
};
