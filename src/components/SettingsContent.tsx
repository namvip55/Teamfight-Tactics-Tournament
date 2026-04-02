import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Save, Upload } from "lucide-react";

const ALL_FRAMES = [
  { id: "default", label: "Mặc định", border: "border-primary", bg: "" },
  { id: "lover", label: "Lover", border: "border-pink-400", bg: "bg-gradient-to-br from-pink-400 to-purple-500" },
  { id: "ocean", label: "Ocean", border: "border-cyan-400", bg: "bg-gradient-to-br from-cyan-400 to-blue-500" },
  { id: "fire", label: "Fire", border: "border-orange-400", bg: "bg-gradient-to-br from-orange-400 to-red-500" },
  { id: "gold", label: "Gold", border: "border-yellow-400", bg: "bg-gradient-to-br from-yellow-300 to-amber-500" },
];

const BADGE_INFO: Record<string, string> = {
  "Đại kiện tướng": "🏆 Vô địch 3 giải đấu",
  "Đại tá": "🥈 Top 2 một giải đấu",
  "Khô gà": "🥉 Top 3 một giải đấu",
};

const SettingsContent = () => {
  const { user } = useAuth();
  const { profile, loading, refetchProfile } = useProfile(user?.id);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedFrame, setSelectedFrame] = useState("default");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [ownedFrames, setOwnedFrames] = useState<Set<string>>(new Set(["default"]));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when profile loads
  if (profile && !initialized) {
    setDisplayName(profile.display_name);
    setBio(profile.bio);
    setSelectedFrame(profile.frame);
    setAvatarPreview(profile.avatar_url);
    setInitialized(true);
  }

  // Fetch purchased frames
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_purchases")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "frame")
      .then(({ data }) => {
        const owned = new Set(["default"]);
        data?.forEach((p: any) => owned.add(p.item_id));
        setOwnedFrames(owned);
      });
  }, [user]);

  const availableFrames = ALL_FRAMES.filter(f => ownedFrames.has(f.id));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Ảnh tối đa 2MB!"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    let avatarUrl = profile?.avatar_url || "";

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) {
        toast.error("Lỗi upload ảnh: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        frame: selectedFrame,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Lỗi lưu: " + error.message);
    } else {
      toast.success("Lưu thành công! ✅");
      setAvatarFile(null);
      refetchProfile();
    }
    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  const currentFrame = ALL_FRAMES.find(f => f.id === selectedFrame) || ALL_FRAMES[0];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">⚙️ CÀI ĐẶT</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border space-y-6">
          <h3 className="text-sm font-bold text-muted-foreground tracking-wide">HỒ SƠ CÁ NHÂN</h3>

          {/* Display name */}
          <div>
            <label className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5 block">TÊN HIỂN THỊ</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={30}
            />
          </div>

          {/* Avatar upload */}
          <div>
            <label className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5 block">AVATAR MỚI</label>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 ${currentFrame.border} flex items-center justify-center bg-muted`}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl text-sm text-foreground hover:bg-muted/80 transition-colors"
              >
                <Upload size={14} /> Chọn tệp
              </button>
              <span className="text-xs text-muted-foreground">
                {avatarFile ? avatarFile.name : "Chưa có tệp nào được chọn"}
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          {/* Frame selector - only owned frames */}
          <div>
            <label className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5 block">
              KHUNG ({availableFrames.length - 1} đã mua)
            </label>
            {availableFrames.length <= 1 ? (
              <p className="text-xs text-muted-foreground">Bạn chưa mua khung nào. Hãy vào Cửa hàng để mua! 🛒</p>
            ) : null}
            <div className="flex gap-3 flex-wrap">
              {availableFrames.map(frame => (
                <button
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame.id)}
                  className={`relative w-14 h-14 rounded-full border-2 transition-all ${
                    selectedFrame === frame.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
                  } ${frame.border} ${frame.bg || "bg-muted"} flex items-center justify-center overflow-hidden`}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary-foreground">{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-primary mt-1.5">Đã chọn: {currentFrame.label}</p>
          </div>

          {/* Badges */}
          <div>
            <label className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5 block">DANH HIỆU</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(BADGE_INFO).map(([badge, desc]) => (
                <div key={badge} className="relative group">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      profile.badges?.includes(badge)
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground opacity-50"
                    }`}
                  >
                    {badge}
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-background text-[10px] rounded hidden group-hover:block whitespace-nowrap z-10">
                    {desc}
                  </div>
                </div>
              ))}
              {profile.badges?.filter(b => !BADGE_INFO[b]).map(b => (
                <span key={b} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{b}</span>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5 block">MÔ TẢ VỀ TÔI</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết gì đó về bản thân..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              maxLength={200}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Đang lưu..." : "LƯU THAY ĐỔI"}
          </button>
        </div>

        {/* Live preview card */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border h-fit">
          <p className="text-xs font-bold text-muted-foreground tracking-wide text-center mb-4">DEMO</p>
          <div className="flex flex-col items-center gap-3">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-3 ${currentFrame.border} ${currentFrame.bg ? "p-1" : ""}`}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-muted">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <h3 className="font-bold text-foreground text-sm">{displayName || "Tên của bạn"}</h3>
            {bio && <p className="text-xs text-muted-foreground text-center">{bio}</p>}
            {profile.badges && profile.badges.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-center">
                {profile.badges.map(b => (
                  <span key={b} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{b}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;
