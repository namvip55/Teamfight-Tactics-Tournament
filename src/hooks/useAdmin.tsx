import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdmin = (userId: string | undefined) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        // Check user_roles table
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) {
          console.error("Error checking admin role:", error.message);
        }

        const hasAdminRole = !error && (data?.length ?? 0) > 0;

        if (hasAdminRole) {
          setIsAdmin(true);
        } else {
          // Fallback: check current user's email
          const { data: { user } } = await supabase.auth.getUser();
          const isAdminViaEmail = user?.email?.toLowerCase().includes("admin");
          setIsAdmin(isAdminViaEmail ?? false);
        }
      } catch (err) {
        console.error("Error in admin check:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [userId]);

  return { isAdmin, loading };
};
