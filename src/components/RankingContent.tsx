import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Gem, CalendarCheck } from "lucide-react";

interface ProfileRank {
  user_id: string;
  display_name: string;
  diamonds: number;
  avatar_url: string | null;
}

interface CheckinRank {
  user_id: string;
  count: number;
  display_name?: string;
}

const RankingContent = () => {
  const [tab, setTab] = useState<"diamonds" | "checkins">("diamonds");
  const [profiles, setProfiles] = useState<ProfileRank[]>([]);
  const [checkinRanks, setCheckinRanks] = useState<CheckinRank[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, diamonds, avatar_url").order("diamonds", { ascending: false }).limit(50);
      if (data) setProfiles(data);
    };

    const fetchCheckins = async () => {
      const { data: checkinsData } = await supabase.from("checkins").select("user_id");
      if (!checkinsData) return;

      // Count per user
      const counts: Record<string, number> = {};
      checkinsData.forEach(c => { counts[c.user_id] = (counts[c.user_id] || 0) + 1; });

      const ranked = Object.entries(counts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      // Get names
      const userIds = ranked.map(r => r.user_id);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profilesData?.forEach(p => { nameMap[p.user_id] = p.display_name; });

      setCheckinRanks(ranked.map(r => ({ ...r, display_name: nameMap[r.user_id] || r.user_id.slice(0, 8) })));
    };

    fetchProfiles();
    fetchCheckins();
  }, []);

  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
        <Trophy size={22} /> BẢNG XẾP HẠNG
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => setTab("diamonds")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "diamonds" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gem size={14} /> Kim cương
        </button>
        <button
          onClick={() => setTab("checkins")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "checkins" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck size={14} /> Thành tích
        </button>
      </div>

      {/* Diamond leaderboard */}
      {tab === "diamonds" && (
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
          <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <Gem size={14} /> XẾP HẠNG KIM CƯƠNG
          </h3>
          <div className="space-y-1">
            {profiles.map((p, i) => (
              <div key={p.user_id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i < 3 ? "bg-primary/5" : "bg-muted/50"}`}>
                <span className="w-8 text-center text-sm font-bold">{medal(i) || (i + 1)}</span>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">{p.display_name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground truncate">{p.display_name}</span>
                <span className="text-sm font-extrabold text-primary flex items-center gap-1">
                  {p.diamonds} <Gem size={12} />
                </span>
              </div>
            ))}
            {profiles.length === 0 && <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>}
          </div>
        </div>
      )}

      {/* Checkin/Achievement leaderboard */}
      {tab === "checkins" && (
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
          <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <CalendarCheck size={14} /> XẾP HẠNG THÀNH TÍCH (ĐIỂM DANH)
          </h3>
          <div className="space-y-1">
            {checkinRanks.map((c, i) => (
              <div key={c.user_id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i < 3 ? "bg-primary/5" : "bg-muted/50"}`}>
                <span className="w-8 text-center text-sm font-bold">{medal(i) || (i + 1)}</span>
                <span className="flex-1 text-sm font-medium text-foreground truncate">{c.display_name}</span>
                <span className="text-sm font-extrabold text-primary">{c.count} ngày</span>
              </div>
            ))}
            {checkinRanks.length === 0 && <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingContent;
