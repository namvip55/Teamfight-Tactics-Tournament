import { useState } from "react";
import { CalendarCheck, Trophy, ShoppingBag, Swords, Settings, LogOut, Moon, Menu, X, Shield, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: {
    name: string;
    avatar: string;
  };
  onSignOut: () => void;
  isAdmin?: boolean;
}

const Sidebar = ({ activeTab, onTabChange, user, onSignOut, isAdmin }: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "attendance", label: "ĐIỂM DANH", icon: CalendarCheck },
    { id: "ranking", label: "XẾP HẠNG", icon: Trophy },
    { id: "shop", label: "CỬA HÀNG", icon: ShoppingBag },
    { id: "tournament", label: "GIẢI ĐẤU", icon: Swords },
    { id: "mail", label: "HỘP THƯ", icon: Mail },
    { id: "settings", label: "CÀI ĐẶT", icon: Settings },
    ...(isAdmin ? [{ id: "admin", label: "QUẢN TRỊ", icon: Shield }] : []),
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={22} className="text-foreground" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen w-64 bg-card border-r border-border p-6 fixed left-0 top-0 z-50 transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 lg:hidden p-1 rounded-md hover:bg-muted"
          aria-label="Close menu"
        >
          <X size={20} className="text-muted-foreground" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28 rounded-xl border-2 border-primary overflow-hidden mb-3 bg-muted flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2 className="text-primary font-bold tracking-widest text-sm">{user.name}</h2>
          {isAdmin && (
            <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive">ADMIN</span>
          )}
        </div>

        <div className="w-full h-px bg-border mb-4" />

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted"
                )}
              >
                <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
          <Moon size={18} className="text-muted-foreground" />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-primary-foreground font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
            <button
              onClick={onSignOut}
              className="text-xs text-destructive font-semibold flex items-center gap-1 hover:underline"
            >
              <LogOut size={12} /> ĐĂNG XUẤT
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
