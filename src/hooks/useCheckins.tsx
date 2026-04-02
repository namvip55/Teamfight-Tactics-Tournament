import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCheckins = (userId: string | undefined) => {
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("checkins")
      .select("checked_in_at")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false });

    if (error) {
      console.error("Error fetching checkins:", error);
      return;
    }

    setTotalCheckins(data.length);

    // Check if checked in today
    const today = new Date().toISOString().split("T")[0];
    const checkedToday = data.some((c) => c.checked_in_at === today);
    setHasCheckedIn(checkedToday);

    // Calculate streak
    let currentStreak = 0;
    const dates = data.map((c) => c.checked_in_at);
    const startDate = checkedToday ? new Date() : new Date(Date.now() - 86400000);

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(startDate);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      if (dates.includes(expectedStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
    setStreak(currentStreak);
    setLoading(false);
  };

  const checkIn = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("checkins")
      .insert({ user_id: userId });

    if (error) {
      if (error.code === "23505") {
        toast.error("Bạn đã điểm danh hôm nay rồi!");
      } else {
        toast.error("Lỗi điểm danh: " + error.message);
      }
      return;
    }

    toast.success("Điểm danh thành công! 🎉");
    await fetchCheckins();
  };

  useEffect(() => {
    fetchCheckins();
  }, [userId]);

  return { totalCheckins, streak, hasCheckedIn, checkIn, loading };
};
