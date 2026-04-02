import { Info, Gem } from "lucide-react";

interface AttendanceContentProps {
  streak: number;
  totalCheckins: number;
  hasCheckedIn: boolean;
  onCheckIn: () => void;
}

const AttendanceContent = ({ streak, totalCheckins, hasCheckedIn, onCheckIn }: AttendanceContentProps) => {
  const reward = streak > 3 ? 15 : 10;

  return (
    <div className="bg-card rounded-2xl p-8 shadow-sm border border-border relative">
      <button className="absolute top-4 right-4 text-primary hover:text-primary/80 transition-colors">
        <Info size={22} />
      </button>

      {hasCheckedIn ? (
        <>
          <h2 className="text-center text-xl font-extrabold tracking-wide text-primary mb-2">
            BẠN ĐÃ ĐIỂM DANH XONG! 🎉
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6 flex items-center justify-center gap-1">
            Bạn nhận được <Gem size={14} className="text-primary" /> <span className="font-bold text-primary">{reward}</span> kim cương
            {streak > 3 && <span className="text-xs text-primary/70">(+5 bonus streak)</span>}
          </p>

          <div className="grid grid-cols-2 gap-6">
            <StatCard emoji="🔥" label="Chuỗi" value={streak} />
            <StatCard emoji="📅" label="Tổng lượt" value={totalCheckins} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-8">
          <h2 className="text-xl font-extrabold tracking-wide text-foreground">
            ĐIỂM DANH HÔM NAY
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Nhận <Gem size={14} className="text-primary" /> <span className="font-bold text-primary">{reward}</span> kim cương
            {streak >= 3 && <span className="text-xs text-primary/70">(+5 bonus streak &gt; 3)</span>}
          </p>
          <button
            onClick={onCheckIn}
            className="px-10 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
          >
            ✅ Điểm danh
          </button>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ emoji, label, value }: { emoji: string; label: string; value: number }) => (
  <div className="bg-muted rounded-2xl p-6 flex flex-col items-center gap-2">
    <span className="flex items-center gap-2 text-muted-foreground font-medium">
      {emoji} {label}
    </span>
    <span className="text-4xl font-extrabold text-primary">{value}</span>
  </div>
);

export default AttendanceContent;
