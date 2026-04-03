import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdmin = (userId: string | undefined) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 useAdmin: Checking admin for userId:", userId);

    if (!userId) {
      console.log("❌ useAdmin: No userId provided");
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        // Step 1: Check user_roles table
        console.log("📊 useAdmin: Querying user_roles table...");
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin");

        console.log("📊 useAdmin: Query result - data:", data, "error:", error);

        if (error) {
          console.error("❌ useAdmin: Database error:", error.message);
        }

        // Step 2: If found in DB, set as admin
        if (!error && (data?.length ?? 0) > 0) {
          console.log("✅ useAdmin: Found admin role in database!");
          setIsAdmin(true);
        } else {
          console.log("⚠️ useAdmin: No admin role in database, checking fallback...");

          // Step 3: Fallback - check current auth user metadata
          const { data: authData, error: authError } = await supabase.auth.getUser();
          const user = authData?.user;

          console.log("👤 useAdmin: Current auth user - DETAILED:");
          console.log("  id:", user?.id);
          console.log("  email:", user?.email);
          console.log("  user_metadata.username:", user?.user_metadata?.username);
          console.log("  user_metadata.full_name:", user?.user_metadata?.full_name);
          console.log("  app_metadata:", user?.app_metadata);

          // Check multiple conditions for admin
          const isAdminViaEmail = user?.email?.toLowerCase() === "admin" ||
                                  user?.email?.toLowerCase() === "admin@user.local" ||
                                  user?.email?.toLowerCase().includes("@admin");
          const isAdminViaMetadata = user?.app_metadata?.role === "admin" ||
                                     user?.user_metadata?.is_admin === true;
          const hasAdminUsername = user?.user_metadata?.username?.toLowerCase() === "admin";
          const hasAdminFullName = user?.user_metadata?.full_name?.toLowerCase() === "admin";

          console.log("🔎 useAdmin: Fallback checks:", {
            isAdminViaEmail,
            isAdminViaMetadata,
            hasAdminUsername,
            hasAdminFullName,
          });

          const isFallbackAdmin = isAdminViaEmail || isAdminViaMetadata || hasAdminUsername || hasAdminFullName;
          console.log("✅ useAdmin: Fallback result:", isFallbackAdmin);
          setIsAdmin(isFallbackAdmin);
        }
      } catch (err) {
        console.error("❌ useAdmin: Unexpected error:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
        console.log("✅ useAdmin: Check complete, loading=false");
      }
    };

    checkAdmin();
  }, [userId]);

  console.log("📤 useAdmin: Returning { isAdmin:", isAdmin, ", loading:", loading, "}");
  return { isAdmin, loading };
};
