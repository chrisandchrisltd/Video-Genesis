import { Link } from "wouter";
import { usePollVideoStatus, getListVideosQueryKey, getGetVideoStatsQueryKey, getPollVideoStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoGeneration } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatDistanceToNow } from "date-fns";
import { Film, Clock, AlertCircle, PlayCircle, Loader2 } from "lucide-react";

export function VideoCard({ video, isDetail = false }: { video: VideoGeneration, isDetail?: boolean }) {
  const queryClient = useQueryClient();
  const isPolling = video.status === "starting" || video.status === "processing";
  
  const { data: polledVideo } = usePollVideoStatus(video.id, {
    query: {
      enabled: isPolling,
      refetchInterval: 3000,
      queryKey: getPollVideoStatusQueryKey(video.id)
    }
  });

  const currentVideo = polledVideo || video;
  const previousStatus = useRef(currentVideo.status);

  useEffect(() => {
    if (!polledVideo) return;

    console.log("Status:", polledVideo.status);
    console.log("FULL RESPONSE:", polledVideo);

    if (polledVideo.status === "failed") {
      console.error("FAILED:", polledVideo);
    }

    if (previousStatus.current !== polledVideo.status) {
      if (polledVideo.status === "succeeded" || polledVideo.status === "failed") {
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVideoStatsQueryKey() });
      }
      previousStatus.current = polledVideo.status;
    }
  }, [polledVideo, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "bg-primary text-primary-foreground";
      case "failed": return "bg-destructive text-destructive-foreground";
      case "starting":
      case "processing": return "bg-blue-500 text-white animate-pulse";
      case "canceled": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const renderMedia = () => {
    if (currentVideo.status === "succeeded" && currentVideo.videoUrl) {
      return (
        <video 
          src={currentVideo.videoUrl} 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover bg-black"
        />
      );
    }
    
    if (currentVideo.status === "starting" || currentVideo.status === "processing") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-card border-b border-border/50 text-muted-foreground gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-mono uppercase tracking-widest text-primary/80">
            {currentVideo.status === "starting" ? "INITIALIZING" : "RENDERING"}
          </span>
        </div>
      );
    }

    if (currentVideo.status === "failed") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-card border-b border-border/50 text-destructive gap-2">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-medium">Generation Failed</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-card border-b border-border/50 text-muted-foreground">
        <Film className="w-8 h-8 opacity-20" />
      </div>
    );
  };

  const CardWrapper = isDetail ? "div" : Link;
  const wrapperProps = isDetail ? {} : { href: `/video/${currentVideo.id}` };

  return (
    <CardWrapper {...wrapperProps} className={isDetail ? "block" : "block transition-transform hover:scale-[1.02] active:scale-[0.98]"}>
      <Card className="overflow-hidden border-border/50 bg-card hover:border-primary/30 transition-colors h-full flex flex-col">
        <div className="relative aspect-video w-full bg-black/50 overflow-hidden">
          {renderMedia()}
          <div className="absolute top-3 right-3 flex gap-2">
            <Badge variant="secondary" className={`font-mono text-xs uppercase tracking-wider border-0 shadow-lg ${getStatusColor(currentVideo.status)}`}>
              {currentVideo.status}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5 flex flex-col flex-grow gap-4">
          <p className="text-sm font-medium leading-relaxed line-clamp-3 text-foreground/90 flex-grow">
            {currentVideo.prompt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> {currentVideo.fps}fps</span>
              <span className="flex items-center gap-1.5"><Film className="w-3.5 h-3.5" /> {currentVideo.numFrames}f</span>
            </div>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(currentVideo.createdAt))} ago</span>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card h-full flex flex-col">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="p-5 flex flex-col flex-grow gap-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6 flex-grow" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
