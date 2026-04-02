import { useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AttendanceContent from "@/components/AttendanceContent";
import TournamentContent from "@/components/TournamentContent";
import SettingsContent from "@/components/SettingsContent";
import ShopContent from "@/components/ShopContent";
import AdminPanel from "@/components/AdminPanel";
import RankingContent from "@/components/RankingContent";
import MailContent from "@/components/MailContent";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCheckins } from "@/hooks/useCheckins";
import { useAdmin } from "@/hooks/useAdmin";

const Index = () => {
  const [activeTab, setActiveTab] = useState("attendance");
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, refetchProfile } = useProfile(user?.id);
  const { streak, totalCheckins, hasCheckedIn, checkIn, loading: checkinsLoading } = useCheckins(user?.id);
  const { isAdmin } = useAdmin(user?.id);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = profileLoading || checkinsLoading;

  const handleCheckIn = async () => {
    await checkIn();
    refetchProfile();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={{
          name: profile?.display_name || user.email || "User",
          avatar: profile?.avatar_url || "",
        }}
        onSignOut={signOut}
        isAdmin={isAdmin}
      />

      <main className="ml-0 lg:ml-64 p-4 pt-16 lg:pt-8 lg:p-8">
        <TopBar streak={streak} diamonds={profile?.diamonds ?? 0} />

        {isLoading ? (
          <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {activeTab === "attendance" && (
              <AttendanceContent
                streak={streak}
                totalCheckins={totalCheckins}
                hasCheckedIn={hasCheckedIn}
                onCheckIn={handleCheckIn}
              />
            )}

            {activeTab === "ranking" && <RankingContent />}

            {activeTab === "shop" && <ShopContent />}

            {activeTab === "tournament" && <TournamentContent isAdmin={isAdmin} />}

            {activeTab === "mail" && <MailContent />}

            {activeTab === "settings" && <SettingsContent />}

            {activeTab === "admin" && isAdmin && <AdminPanel />}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
