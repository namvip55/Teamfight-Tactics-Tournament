import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Gem, Users, Plus, Trash2, Send } from "lucide-react";
import AdminMailSender from "./AdminMailSender";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface ProfileInfo {
  user_id: string;
  display_name: string;
  diamonds: number;
}

const AdminPanel = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [newAdminId, setNewAdminId] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState(10);

  const fetchData = async () => {
    const [{ data: rolesData }, { data: profilesData }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("user_id, display_name, diamonds"),
    ]);
    if (rolesData) setRoles(rolesData as UserRole[]);
    if (profilesData) setProfiles(profilesData as ProfileInfo[]);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddAdmin = async () => {
    if (!newAdminId.trim()) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: newAdminId.trim(), role: "admin" });
    if (error) toast.error("Lỗi: " + error.message);
    else { toast.success("Đã thêm admin!"); setNewAdminId(""); fetchData(); }
  };

  const handleRemoveRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) toast.error("Lỗi: " + error.message);
    else { toast.success("Đã xóa!"); fetchData(); }
  };

  const handleGrantDiamonds = async () => {
    if (!grantUserId || grantAmount <= 0) return;
    const { error } = await supabase.rpc("award_diamonds", { _user_id: grantUserId, _amount: grantAmount });
    if (error) toast.error("Lỗi: " + error.message);
    else { toast.success(`Đã trao ${grantAmount} 💎!`); setGrantAmount(10); fetchData(); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
        <Shield size={22} /> QUẢN TRỊ VIÊN
      </h2>

      {/* Admin list */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground">DANH SÁCH ADMIN</h3>
        {roles.filter(r => r.role === "admin").map(r => {
          const p = profiles.find(pr => pr.user_id === r.user_id);
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
              <Shield size={14} className="text-primary" />
              <span className="flex-1 text-sm font-medium text-foreground">{p?.display_name || r.user_id.slice(0, 8)}</span>
              <button onClick={() => handleRemoveRole(r.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
            </div>
          );
        })}
        <div className="flex gap-2">
          <select value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Chọn người dùng...</option>
            {profiles.filter(p => !roles.some(r => r.user_id === p.user_id && r.role === "admin")).map(p => (
              <option key={p.user_id} value={p.user_id}>{p.display_name || p.user_id.slice(0, 8)}</option>
            ))}
          </select>
          <button onClick={handleAddAdmin} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90"><Plus size={16} /></button>
        </div>
      </div>

      {/* Grant diamonds */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2"><Gem size={14} /> TRAO KIM CƯƠNG</h3>
        <div className="space-y-2">
          <select value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Chọn người nhận...</option>
            {profiles.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.display_name} ({p.diamonds} 💎)</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="number" value={grantAmount} onChange={(e) => setGrantAmount(Number(e.target.value))}
              min={1} className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={handleGrantDiamonds} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">
              <Send size={14} /> TRAO
            </button>
          </div>
        </div>

        {/* All users with diamonds */}
        <h3 className="text-sm font-bold text-muted-foreground mt-4 flex items-center gap-2"><Users size={14} /> TẤT CẢ NGƯỜI DÙNG</h3>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {profiles.sort((a, b) => b.diamonds - a.diamonds).map(p => (
            <div key={p.user_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
              <span className="flex-1 text-sm text-foreground">{p.display_name}</span>
              <span className="text-sm font-bold text-primary">{p.diamonds} 💎</span>
            </div>
          ))}
        </div>
      </div>
      {/* Mail sender */}
      <AdminMailSender />
    </div>
  );
};

export default AdminPanel;
