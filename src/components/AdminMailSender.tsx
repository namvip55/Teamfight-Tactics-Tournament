import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";

interface ProfileInfo {
  user_id: string;
  display_name: string;
}

const AdminMailSender = () => {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [sendAll, setSendAll] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [diamonds, setDiamonds] = useState(0);
  const [badge, setBadge] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("user_id, display_name").then(({ data }) => {
      if (data) setProfiles(data as ProfileInfo[]);
    });
  }, []);

  const handleSend = async () => {
    if (!title.trim()) { toast.error("Cần nhập tiêu đề!"); return; }
    setSending(true);

    const targets = sendAll ? profiles.map(p => p.user_id) : targetUserId ? [targetUserId] : [];
    if (targets.length === 0) { toast.error("Chọn người nhận!"); setSending(false); return; }

    const rows = targets.map(uid => ({
      user_id: uid,
      title: title.trim(),
      content: content.trim(),
      diamonds_reward: diamonds,
      badge_reward: badge.trim() || null,
      sender_type: "admin",
    }));

    const { error } = await supabase.from("messages").insert(rows);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success(`Đã gửi thư cho ${targets.length} người! 📨`);
      setTitle("");
      setContent("");
      setDiamonds(0);
      setBadge("");
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
      <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
        <Send size={14} /> GỬI THƯ
      </h3>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={sendAll} onChange={(e) => setSendAll(e.target.checked)}
            className="rounded border-border" />
          Gửi tất cả
        </label>
        {!sendAll && (
          <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Chọn người nhận...</option>
            {profiles.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
            ))}
          </select>
        )}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề thư..."
        className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nội dung thư..."
        rows={3}
        className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-muted-foreground">KIM CƯƠNG THƯỞNG</label>
          <input type="number" value={diamonds} onChange={(e) => setDiamonds(Number(e.target.value))} min={0}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold text-muted-foreground">DANH HIỆU THƯỞNG</label>
          <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="VD: Đại kiện tướng"
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <button onClick={handleSend} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
        <Send size={14} /> {sending ? "Đang gửi..." : "GỬI THƯ"}
      </button>
    </div>
  );
};

export default AdminMailSender;
