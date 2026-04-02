import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Users, Shuffle, Trash2, ArrowLeft, Trophy, ClipboardList, Save, Gem, Send, UserPlus, Check, X, Play, Square } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  max_players: number;
  status: string;
  created_at: string;
  created_by: string;
}

interface TournamentPlayer {
  id: string;
  player_name: string;
  group_number: number | null;
  tournament_id: string;
  user_id: string | null;
  is_ready: boolean;
}

interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
}

interface TournamentScore {
  id: string;
  round_id: string;
  player_id: string;
  placement: number;
  score: number;
}

const PLACEMENT_SCORES: Record<number, number> = {
  1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1,
};

const TournamentContent = ({ isAdmin }: { isAdmin?: boolean }) => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [scores, setScores] = useState<TournamentScore[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMaxPlayers, setNewMaxPlayers] = useState(16);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"players" | "groups" | "scores" | "leaderboard">("players");
  const [selectedRound, setSelectedRound] = useState<TournamentRound | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number>(1);
  const [placementInputs, setPlacementInputs] = useState<Record<string, number>>({});

  const fetchTournaments = async () => {
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    if (data) setTournaments(data);
  };

  const fetchPlayers = async (tournamentId: string) => {
    const { data } = await supabase.from("tournament_players").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: true });
    if (data) setPlayers(data as TournamentPlayer[]);
  };

  const fetchRounds = async (tournamentId: string) => {
    const { data } = await supabase.from("tournament_rounds").select("*").eq("tournament_id", tournamentId).order("round_number", { ascending: true });
    if (data) setRounds(data);
  };

  const fetchScores = async (tournamentId: string) => {
    const { data: roundsData } = await supabase.from("tournament_rounds").select("id").eq("tournament_id", tournamentId);
    if (!roundsData || roundsData.length === 0) { setScores([]); return; }
    const { data } = await supabase.from("tournament_scores").select("*").in("round_id", roundsData.map(r => r.id));
    if (data) setScores(data);
  };

  useEffect(() => { fetchTournaments(); }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchPlayers(selectedTournament.id);
      fetchRounds(selectedTournament.id);
      fetchScores(selectedTournament.id);
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (!selectedRound) return;
    const groupPlayers = players.filter(p => p.group_number === selectedGroup);
    const existing: Record<string, number> = {};
    groupPlayers.forEach(p => {
      const s = scores.find(sc => sc.round_id === selectedRound.id && sc.player_id === p.id);
      existing[p.id] = s ? s.placement : 0;
    });
    setPlacementInputs(existing);
  }, [selectedRound, selectedGroup, scores, players]);

  // Check if current user is registered
  const myRegistration = players.find(p => p.user_id === user?.id);
  const isOwner = selectedTournament?.created_by === user?.id;
  const canManage = isOwner || isAdmin;

  // === HANDLERS ===

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("tournaments").insert({ name: newName.trim(), max_players: newMaxPlayers, created_by: user.id }).select().single();
    if (error) toast.error("Lỗi tạo giải đấu: " + error.message);
    else { toast.success("Tạo giải đấu thành công!"); setNewName(""); setNewMaxPlayers(16); setShowCreateForm(false); fetchTournaments(); if (data) setSelectedTournament(data); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!selectedTournament || !user || !registerName.trim()) return;
    if (players.length >= selectedTournament.max_players) { toast.error("Giải đấu đã đủ người!"); return; }
    const { error } = await supabase.from("tournament_players").insert({
      tournament_id: selectedTournament.id,
      player_name: registerName.trim(),
      user_id: user.id,
    });
    if (error) {
      if (error.code === "23505") toast.error("Bạn đã đăng ký rồi!");
      else toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đăng ký thành công! 🎮");
      setRegisterName("");
      setShowRegister(false);
      fetchPlayers(selectedTournament.id);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !newPlayerName.trim()) return;
    if (players.length >= selectedTournament.max_players) { toast.error(`Đã đủ ${selectedTournament.max_players} người!`); return; }
    const { error } = await supabase.from("tournament_players").insert({ tournament_id: selectedTournament.id, player_name: newPlayerName.trim() });
    if (error) toast.error("Lỗi: " + error.message);
    else { setNewPlayerName(""); fetchPlayers(selectedTournament.id); }
  };

  const handleRemovePlayer = async (playerId: string) => {
    await supabase.from("tournament_players").delete().eq("id", playerId);
    if (selectedTournament) fetchPlayers(selectedTournament.id);
  };

  const handleReady = async () => {
    if (!myRegistration) return;
    const { error } = await supabase.from("tournament_players").update({ is_ready: !myRegistration.is_ready }).eq("id", myRegistration.id);
    if (error) toast.error("Lỗi: " + error.message);
    else { toast.success(myRegistration.is_ready ? "Đã hủy sẵn sàng" : "Đã sẵn sàng! ✅"); if (selectedTournament) fetchPlayers(selectedTournament.id); }
  };

  const handleStartTournament = async () => {
    if (!selectedTournament) return;
    await supabase.from("tournaments").update({ status: "starting" }).eq("id", selectedTournament.id);
    setSelectedTournament({ ...selectedTournament, status: "starting" });
    toast.success("Đã bắt đầu! Chờ người chơi sẵn sàng...");
  };

  const handleBeginMatches = async () => {
    if (!selectedTournament) return;
    // Remove unready players
    const unready = players.filter(p => !p.is_ready);
    for (const p of unready) {
      await supabase.from("tournament_players").delete().eq("id", p.id);
    }
    if (unready.length > 0) toast.info(`Đã loại ${unready.length} người chưa sẵn sàng`);

    // Shuffle remaining into groups
    const readyPlayers = players.filter(p => p.is_ready);
    const shuffled = [...readyPlayers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from("tournament_players").update({ group_number: Math.floor(i / 8) + 1 }).eq("id", shuffled[i].id);
    }
    await supabase.from("tournaments").update({ status: "playing" }).eq("id", selectedTournament.id);
    setSelectedTournament({ ...selectedTournament, status: "playing" });
    toast.success("Chia bảng & bắt đầu thi đấu! 🎲");
    fetchPlayers(selectedTournament.id);
  };

  const handleEndTournament = async () => {
    if (!selectedTournament) return;
    await supabase.from("tournaments").update({ status: "ended" }).eq("id", selectedTournament.id);
    setSelectedTournament({ ...selectedTournament, status: "ended" });
    toast.success("Giải đấu đã kết thúc! 🏁");
  };

  const handleShuffle = async () => {
    if (!selectedTournament || players.length < 8) { toast.error("Cần ít nhất 8 người chơi!"); return; }
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from("tournament_players").update({ group_number: Math.floor(i / 8) + 1 }).eq("id", shuffled[i].id);
    }
    await supabase.from("tournaments").update({ status: "grouped" }).eq("id", selectedTournament.id);
    toast.success("Chia bảng thành công! 🎲");
    fetchPlayers(selectedTournament.id);
    setSelectedTournament({ ...selectedTournament, status: "grouped" });
  };

  const handleAddRound = async () => {
    if (!selectedTournament) return;
    const nextRound = rounds.length + 1;
    const { data, error } = await supabase.from("tournament_rounds").insert({ tournament_id: selectedTournament.id, round_number: nextRound }).select().single();
    if (error) toast.error("Lỗi tạo trận: " + error.message);
    else { toast.success(`Tạo Trận ${nextRound}!`); fetchRounds(selectedTournament.id); if (data) setSelectedRound(data); }
  };

  const handleDeleteRound = async (roundId: string) => {
    await supabase.from("tournament_scores").delete().eq("round_id", roundId);
    await supabase.from("tournament_rounds").delete().eq("id", roundId);
    if (selectedTournament) { fetchRounds(selectedTournament.id); fetchScores(selectedTournament.id); }
    if (selectedRound?.id === roundId) setSelectedRound(null);
    toast.success("Đã xóa trận!");
  };

  const handleSaveScores = async () => {
    if (!selectedRound) return;
    const groupPlayers = players.filter(p => p.group_number === selectedGroup);
    const placements = Object.values(placementInputs).filter(v => v > 0);
    if (placements.length !== groupPlayers.length) { toast.error("Vui lòng nhập xếp hạng cho tất cả người chơi!"); return; }
    const uniquePlacements = new Set(placements);
    if (uniquePlacements.size !== placements.length) { toast.error("Xếp hạng không được trùng nhau!"); return; }

    for (const player of groupPlayers) {
      const placement = placementInputs[player.id];
      if (!placement) continue;
      const score = PLACEMENT_SCORES[placement] || 0;
      const existing = scores.find(s => s.round_id === selectedRound.id && s.player_id === player.id);
      if (existing) {
        await supabase.from("tournament_scores").update({ placement, score }).eq("id", existing.id);
      } else {
        await supabase.from("tournament_scores").insert({ round_id: selectedRound.id, player_id: player.id, placement, score });
      }
    }
    toast.success("Lưu điểm thành công! ✅");
    if (selectedTournament) fetchScores(selectedTournament.id);
  };

  const handleDeleteTournament = async (id: string) => {
    await supabase.from("tournaments").delete().eq("id", id);
    toast.success("Đã xóa giải đấu!"); setSelectedTournament(null); fetchTournaments();
  };

  // Group players
  const groupedPlayers = players.reduce<Record<number, TournamentPlayer[]>>((acc, p) => {
    const g = p.group_number ?? 0;
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});
  const totalGroups = Math.max(...Object.keys(groupedPlayers).filter(g => Number(g) > 0).map(Number), 0);

  // Checkmate leaderboard
  const getLeaderboard = () => {
    const totals: Record<string, { player: TournamentPlayer; totalScore: number; roundScores: Record<string, number>; top1Count: number }> = {};
    players.forEach(p => { totals[p.id] = { player: p, totalScore: 0, roundScores: {}, top1Count: 0 }; });
    scores.forEach(s => {
      if (totals[s.player_id]) {
        totals[s.player_id].totalScore += s.score;
        totals[s.player_id].roundScores[s.round_id] = s.score;
        if (s.placement === 1) totals[s.player_id].top1Count++;
      }
    });
    const entries = Object.values(totals).sort((a, b) => b.totalScore - a.totalScore);
    // Checkmate: ≥20 pts AND has top1 → champion
    const champion = entries.find(e => e.totalScore >= 20 && e.top1Count > 0);
    return { entries, champion };
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "open": return { text: "Đang mở", cls: "bg-green-500/10 text-green-500" };
      case "starting": return { text: "Chuẩn bị", cls: "bg-yellow-500/10 text-yellow-500" };
      case "playing": return { text: "Đang đấu", cls: "bg-blue-500/10 text-blue-500" };
      case "grouped": return { text: "Đã chia bảng", cls: "bg-blue-500/10 text-blue-500" };
      case "ended": return { text: "Đã kết thúc", cls: "bg-muted text-muted-foreground" };
      default: return { text: status, cls: "bg-muted text-muted-foreground" };
    }
  };

  // ==================== DETAIL VIEW ====================
  if (selectedTournament) {
    const { entries: leaderboard, champion } = getLeaderboard();
    const st = selectedTournament.status;
    const isActive = ["playing", "grouped"].includes(st);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => { setSelectedTournament(null); setActiveView("players"); setSelectedRound(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary truncate">{selectedTournament.name}</h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>{players.length}/{selectedTournament.max_players} người</span>
                <span>•</span>
                <span>{rounds.length} trận</span>
                {totalGroups > 0 && <><span>•</span><span>{totalGroups} bảng</span></>}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabel(st).cls}`}>{statusLabel(st).text}</span>
              </div>
            </div>
          </div>

          {/* Champion banner */}
          {champion && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
              <p className="text-sm font-bold text-yellow-600">🏆 VÔ ĐỊCH: {champion.player.player_name}</p>
              <p className="text-xs text-yellow-600/70">{champion.totalScore} điểm • Đạt Top 1 trong {champion.top1Count} trận</p>
            </div>
          )}

          {/* Admin controls */}
          {canManage && (
            <div className="flex flex-wrap gap-2 mb-4">
              {st === "open" && (
                <button onClick={handleStartTournament} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 text-yellow-950 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors">
                  <Play size={14} /> BẮT ĐẦU GIẢI ĐẤU
                </button>
              )}
              {st === "starting" && (
                <button onClick={handleBeginMatches} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                  <Shuffle size={14} /> CHIA BẢNG & ĐẤU ({players.filter(p => p.is_ready).length} sẵn sàng)
                </button>
              )}
              {isActive && (
                <button onClick={handleEndTournament} className="flex items-center gap-1.5 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl font-bold text-sm hover:bg-destructive/90 transition-colors">
                  <Square size={14} /> KẾT THÚC
                </button>
              )}
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {[
              { key: "players" as const, label: "Người chơi", icon: Users },
              ...(isActive || st === "ended" ? [
                { key: "groups" as const, label: "Bảng đấu", icon: Users },
                { key: "scores" as const, label: "Nhập điểm", icon: ClipboardList },
                { key: "leaderboard" as const, label: "Xếp hạng", icon: Trophy },
              ] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  activeView === tab.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PLAYERS VIEW */}
        {activeView === "players" && (
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-muted-foreground">DANH SÁCH NGƯỜI CHƠI ({players.length})</h3>
              {/* User registration */}
              {st === "open" && !myRegistration && (
                <button onClick={() => setShowRegister(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors">
                  <UserPlus size={14} /> ĐĂNG KÝ
                </button>
              )}
            </div>

            {/* Registration form */}
            {showRegister && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <label className="text-xs font-bold text-muted-foreground">TÊN IN-GAME CỦA BẠN</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nhập tên in-game TFT..." value={registerName} onChange={(e) => setRegisterName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" maxLength={50} />
                  <button onClick={handleRegister} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">OK</button>
                  <button onClick={() => setShowRegister(false)} className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-sm">Hủy</button>
                </div>
              </div>
            )}

            {/* Ready button for starting state */}
            {st === "starting" && myRegistration && (
              <button
                onClick={handleReady}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                  myRegistration.is_ready
                    ? "bg-green-500/10 text-green-500 border border-green-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {myRegistration.is_ready ? <><Check size={16} /> ĐÃ SẴN SÀNG</> : <><Play size={16} /> SẴN SÀNG</>}
              </button>
            )}

            {/* Admin add player */}
            {canManage && st === "open" && (
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input type="text" placeholder="Admin thêm người chơi..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" maxLength={50} />
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm"><Plus size={16} /></button>
              </form>
            )}

            {/* Player list */}
            {players.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Chưa có người chơi nào. Hãy đăng ký tham gia!</p>
            ) : (
              <div className="space-y-1.5">
                {players.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    st === "starting" ? (p.is_ready ? "bg-green-500/5 border border-green-500/20" : "bg-muted") : "bg-muted"
                  }`}>
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {p.player_name}
                      {p.user_id === user?.id && <span className="text-xs text-primary ml-1">(Bạn)</span>}
                    </span>
                    {st === "starting" && (
                      <span className={`text-xs font-bold ${p.is_ready ? "text-green-500" : "text-muted-foreground"}`}>
                        {p.is_ready ? "✅ Sẵn sàng" : "⏳ Chờ..."}
                      </span>
                    )}
                    {canManage && (st === "open" || st === "starting") && (
                      <button onClick={() => handleRemovePlayer(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GROUPS VIEW */}
        {activeView === "groups" && (isActive || st === "ended") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupedPlayers).filter(([g]) => Number(g) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([groupNum, gPlayers]) => (
              <div key={groupNum} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <h3 className="text-lg font-extrabold text-primary mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">{groupNum}</span>
                  Bảng {groupNum}
                </h3>
                <div className="space-y-2">
                  {gPlayers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground">{p.player_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCORES VIEW */}
        {activeView === "scores" && (isActive || st === "ended") && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-muted-foreground">CHỌN TRẬN</h3>
                {canManage && st !== "ended" && (
                  <button onClick={handleAddRound} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors">
                    <Plus size={14} /> Thêm trận
                  </button>
                )}
              </div>
              {rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Chưa có trận nào.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rounds.map(r => (
                    <div key={r.id} className="flex items-center gap-1">
                      <button onClick={() => setSelectedRound(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          selectedRound?.id === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}>
                        Trận {r.round_number}
                      </button>
                      {canManage && st !== "ended" && (
                        <button onClick={() => handleDeleteRound(r.id)} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedRound && (
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-muted-foreground">TRẬN {selectedRound.round_number} - BẢNG {selectedGroup}</h3>
                  <div className="flex gap-1">
                    {Array.from({ length: totalGroups }, (_, i) => i + 1).map(g => (
                      <button key={g} onClick={() => setSelectedGroup(g)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          selectedGroup === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {players.filter(p => p.group_number === selectedGroup).map(p => {
                    const currentPlacement = placementInputs[p.id] || 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                        <span className="flex-1 text-sm font-medium text-foreground">{p.player_name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(place => (
                            <button key={place} onClick={() => setPlacementInputs(prev => ({ ...prev, [p.id]: place }))}
                              className={`w-7 h-7 rounded-md text-xs font-bold transition-colors ${
                                currentPlacement === place
                                  ? place <= 3 ? "bg-yellow-500 text-yellow-950" : place <= 5 ? "bg-blue-500 text-blue-50" : "bg-muted-foreground/30 text-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted-foreground/20"
                              }`}>{place}</button>
                          ))}
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-primary">
                          {currentPlacement > 0 ? `+${PLACEMENT_SCORES[currentPlacement]}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {canManage && (
                  <button onClick={handleSaveScores} className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                    <Save size={16} /> LƯU ĐIỂM
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD VIEW - Checkmate format */}
        {activeView === "leaderboard" && (isActive || st === "ended") && (
          <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
            <h3 className="text-lg font-extrabold text-primary mb-2 flex items-center gap-2">
              <Trophy size={20} /> BẢNG XẾP HẠNG - CHECKMATE
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Thể thức Checkmate: Đạt ≥20 điểm + Top 1 trong trận = 🏆 VÔ ĐỊCH
            </p>

            <div className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border mb-2">
              <span className="w-8 text-center">#</span>
              <span className="flex-1">Người chơi</span>
              {rounds.map(r => <span key={r.id} className="w-10 text-center">T{r.round_number}</span>)}
              <span className="w-14 text-right">Tổng</span>
            </div>

            {leaderboard.map((entry, index) => {
              const isChampion = champion?.player.id === entry.player.id;
              const medal = isChampion ? "🏆" : index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
              return (
                <div key={entry.player.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${
                  isChampion ? "bg-yellow-500/10 border border-yellow-500/30" : index < 3 ? "bg-primary/5" : "bg-muted/50"
                }`}>
                  <span className="w-8 text-center text-sm font-bold">{medal || (index + 1)}</span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {entry.player.player_name}
                    {entry.player.group_number && <span className="text-xs text-muted-foreground ml-1">B{entry.player.group_number}</span>}
                    {isChampion && <span className="text-xs text-yellow-600 ml-1 font-bold">VÔ ĐỊCH</span>}
                    {!isChampion && entry.totalScore >= 20 && <span className="text-xs text-primary/60 ml-1">≥20pts</span>}
                  </span>
                  {rounds.map(r => (
                    <span key={r.id} className="w-10 text-center text-xs text-muted-foreground">
                      {entry.roundScores[r.id] ?? "—"}
                    </span>
                  ))}
                  <span className="w-14 text-right text-sm font-extrabold text-primary">{entry.totalScore}</span>
                </div>
              );
            })}

            {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu điểm</p>}

            {/* Admin reward */}
            {isAdmin && leaderboard.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                  <Gem size={14} /> TRAO THƯỞNG TOP 10
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Top 1=50💎, Top 2=40💎, Top 3=35💎, Top 4=30💎, Top 5=25💎, Top 6=20💎, Top 7=15💎, Top 8=10💎, Top 9=5💎, Top 10=3💎
                </p>
                <button
                  onClick={async () => {
                    const rewards: Record<number, number> = { 1: 50, 2: 40, 3: 35, 4: 30, 5: 25, 6: 20, 7: 15, 8: 10, 9: 5, 10: 3 };
                    const top10 = leaderboard.slice(0, 10);
                    let awarded = 0;
                    for (let i = 0; i < top10.length; i++) {
                      const amount = rewards[i + 1] || 0;
                      const playerId = top10[i].player.user_id;
                      if (amount > 0 && playerId) {
                        await supabase.rpc("award_diamonds", { _user_id: playerId, _amount: amount });
                        awarded++;
                      }
                    }
                    toast.success(`Đã trao thưởng cho ${awarded} người chơi! 🎉`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Send size={14} /> TRAO THƯỞNG
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==================== TOURNAMENT LIST ====================
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-extrabold text-primary">⚔️ GIẢI ĐẤU TFT</h2>
        {canManage && (
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus size={16} /> TẠO GIẢI
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateTournament} className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
          <h3 className="font-bold text-foreground">Tạo giải đấu mới</h3>
          <input type="text" placeholder="Tên giải đấu" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required maxLength={100} />
          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1 block">Số người chơi tối đa</label>
            <select value={newMaxPlayers} onChange={(e) => setNewMaxPlayers(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {[8, 16, 24, 32, 40, 48, 56, 64].map(n => <option key={n} value={n}>{n} người ({n / 8} bảng)</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? "Đang tạo..." : "Tạo giải đấu"}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-muted/80 transition-colors">Hủy</button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center text-muted-foreground">
          Chưa có giải đấu nào. Hãy tạo giải đấu đầu tiên!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map(t => {
            const s = statusLabel(t.status);
            return (
              <button key={t.id} onClick={() => setSelectedTournament(t)}
                className="bg-card rounded-2xl p-5 shadow-sm border border-border text-left hover:border-primary/50 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                  {(t.created_by === user?.id || isAdmin) && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users size={14} /> {t.max_players} người</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TournamentContent;
