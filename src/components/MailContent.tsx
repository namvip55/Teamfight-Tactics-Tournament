import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Mail, Gift, Gem, Check, Bell } from "lucide-react";

interface Message {
  id: string;
  title: string;
  content: string;
  is_read: boolean;
  diamonds_reward: number;
  badge_reward: string | null;
  sender_type: string;
  claimed: boolean;
  created_at: string;
}

const MailContent = () => {
  const { user } = useAuth();
  const { refetchProfile } = useProfile(user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setMessages(data as Message[]);
  };

  useEffect(() => { fetchMessages(); }, [user]);

  const handleClaim = async (msg: Message) => {
    if (!user) return;
    setClaiming(msg.id);
    const { data, error } = await supabase.rpc("claim_mail_reward", {
      _message_id: msg.id,
      _user_id: user.id,
    });
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else if (data === "already_claimed") {
      toast.error("Đã nhận rồi!");
    } else {
      toast.success("Nhận thưởng thành công! 🎉");
      fetchMessages();
      refetchProfile();
    }
    setClaiming(null);
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from("messages").update({ is_read: true }).eq("id", id);
    fetchMessages();
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
          <Mail size={22} /> HỘP THƯ
        </h2>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">
            {unreadCount} chưa đọc
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center text-muted-foreground">
          <Mail size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có thư nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => {
            const hasReward = msg.diamonds_reward > 0 || msg.badge_reward;
            return (
              <div
                key={msg.id}
                className={`bg-card rounded-2xl p-4 shadow-sm border transition-colors ${
                  !msg.is_read ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender_type === "admin" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {msg.sender_type === "admin" ? (
                      <Bell size={18} className="text-destructive" />
                    ) : (
                      <Gift size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-sm">{msg.title}</h4>
                      {!msg.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>

                    {hasReward && (
                      <div className="flex items-center gap-3 mt-2">
                        {msg.diamonds_reward > 0 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-primary">
                            <Gem size={12} /> +{msg.diamonds_reward}
                          </span>
                        )}
                        {msg.badge_reward && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600">
                            🏅 {msg.badge_reward}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      {hasReward && !msg.claimed ? (
                        <button
                          onClick={() => handleClaim(msg)}
                          disabled={claiming === msg.id}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {claiming === msg.id ? "..." : "NHẬN THƯỞNG"}
                        </button>
                      ) : hasReward && msg.claimed ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Check size={12} /> Đã nhận
                        </span>
                      ) : !msg.is_read ? (
                        <button
                          onClick={() => handleMarkRead(msg.id)}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          Đánh dấu đã đọc
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MailContent;
