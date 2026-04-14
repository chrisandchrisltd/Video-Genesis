import { useGetVideoStats } from "@workspace/api-client-react";
import { getGetVideoStatsQueryKey } from "@workspace/api-client-react";
import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsBar() {
  const { data: stats, isLoading } = useGetVideoStats({
    query: {
      queryKey: getGetVideoStatsQueryKey(),
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-lg bg-card border border-border/50">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    { label: "Total Generated", value: stats.total, icon: Activity, color: "text-primary" },
    { label: "Succeeded", value: stats.succeeded, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Processing", value: stats.processing, icon: Clock, color: "text-blue-500" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((stat, i) => (
        <div key={i} className="p-4 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm flex items-center justify-between group hover:bg-card hover:border-border/60 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{stat.label}</span>
            <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
          </div>
          <stat.icon className={`w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity ${stat.color}`} />
        </div>
      ))}
    </div>
  );
}
