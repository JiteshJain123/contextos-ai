export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="relative size-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>
      <p className="text-sm text-muted-foreground/60 tracking-wide">Loading…</p>
    </div>
  );
}
