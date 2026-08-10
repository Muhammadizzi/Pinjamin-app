export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border" />
          <div className="h-32 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border" />
          <div className="h-32 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border" />
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border" />
      </div>
    </div>
  );
}
