import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { ShoppingBag, Gem, Check } from "lucide-react";

interface ShopItem {
  id: string;
  item_type: string;
  item_id: string;
  name: string;
  price: number;
  description: string;
}

const FRAME_STYLES: Record<string, { border: string; bg: string }> = {
  default: { border: "border-primary", bg: "" },
  lover: { border: "border-pink-400", bg: "bg-gradient-to-br from-pink-400 to-purple-500" },
  ocean: { border: "border-cyan-400", bg: "bg-gradient-to-br from-cyan-400 to-blue-500" },
  fire: { border: "border-orange-400", bg: "bg-gradient-to-br from-orange-400 to-red-500" },
  gold: { border: "border-yellow-400", bg: "bg-gradient-to-br from-yellow-300 to-amber-500" },
};

const ShopContent = () => {
  const { user } = useAuth();
  const { profile, refetchProfile } = useProfile(user?.id);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState<string | null>(null);

  const fetchItems = async () => {
    const { data } = await supabase.from("shop_items").select("*").order("price");
    if (data) setItems(data as ShopItem[]);
  };

  const fetchPurchases = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_purchases").select("item_type, item_id").eq("user_id", user.id);
    if (data) setPurchases(new Set(data.map((p: any) => `${p.item_type}:${p.item_id}`)));
  };

  useEffect(() => { fetchItems(); fetchPurchases(); }, [user]);

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    setBuying(item.id);

    const { data, error } = await supabase.rpc("purchase_item", {
      _user_id: user.id,
      _item_type: item.item_type,
      _item_id: item.item_id,
    });

    if (error) {
      toast.error("Lỗi mua: " + error.message);
    } else if (data === "already_owned") {
      toast.error("Bạn đã sở hữu vật phẩm này!");
    } else if (data === "insufficient") {
      toast.error("Không đủ kim cương! 💎");
    } else if (data === "not_found") {
      toast.error("Vật phẩm không tồn tại!");
    } else {
      toast.success(`Mua ${item.name} thành công! 🎉`);
      fetchPurchases();
      refetchProfile();
    }
    setBuying(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
          <ShoppingBag size={22} /> CỬA HÀNG
        </h2>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-lg">
          <Gem size={16} className="text-primary" />
          <span className="font-bold text-primary text-sm">{profile?.diamonds ?? 0}</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="text-sm font-bold text-muted-foreground tracking-wide mb-4">KHUNG AVATAR</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.filter(i => i.item_type === "frame").map(item => {
            const owned = purchases.has(`${item.item_type}:${item.item_id}`);
            const style = FRAME_STYLES[item.item_id] || FRAME_STYLES.default;
            const equipped = profile?.frame === item.item_id;

            return (
              <div key={item.id} className={`rounded-xl p-4 border transition-colors ${owned ? "border-primary/30 bg-primary/5" : "border-border bg-muted/50"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full border-2 ${style.border} ${style.bg || "bg-muted"} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg font-bold text-primary-foreground">
                      {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-sm">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Gem size={12} className="text-primary" />
                      <span className="text-xs font-bold text-primary">{item.price}</span>
                    </div>
                  </div>
                  <div>
                    {owned ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        <Check size={12} /> {equipped ? "Đang dùng" : "Đã mua"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={buying === item.id}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {buying === item.id ? "..." : "MUA"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="text-sm font-bold text-muted-foreground tracking-wide mb-3">CÁCH KIẾM KIM CƯƠNG 💎</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✅ Điểm danh hàng ngày: <span className="text-primary font-bold">+10 💎</span></p>
          <p>🔥 Chuỗi streak &gt; 3 ngày: <span className="text-primary font-bold">+15 💎</span> mỗi ngày</p>
          <p>🏆 Giải đấu top 10: Nhận thưởng kim cương từ admin</p>
        </div>
      </div>
    </div>
  );
};

export default ShopContent;
