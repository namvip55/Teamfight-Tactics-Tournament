interface TopBarProps {
  streak: number;
  diamonds: number;
}

const TopBar = ({ streak, diamonds }: TopBarProps) => {
  return (
    <div className="flex justify-end gap-3 mb-6">
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
        <span className="text-sm text-muted-foreground font-medium">CHUỖI</span>
        <div className="flex items-center gap-1">
          <span>🔥</span>
          <span className="text-lg font-bold text-foreground">{streak}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
        <span className="text-sm text-muted-foreground font-medium">KIM CƯƠNG</span>
        <div className="flex items-center gap-1">
          <span>💎</span>
          <span className="text-lg font-bold text-foreground">{diamonds}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
