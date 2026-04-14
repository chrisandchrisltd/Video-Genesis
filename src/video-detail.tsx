import { useRoute, Link, useLocation } from "wouter";
import { useGetVideo, useDeleteVideo, usePollVideoStatus, getGetVideoQueryKey, getListVideosQueryKey, getGetVideoStatsQueryKey, getPollVideoStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2, Clock, Film, AlertCircle, PlayCircle, Loader2, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function VideoDetail() {
  const [, params] = useRoute("/video/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: initialVideo, isLoading } = useGetVideo(id, {
    query: {
      enabled: !!id,
      queryKey: getGetVideoQueryKey(id)
    }
  });

  const isPolling = initialVideo?.status === "starting" || initialVideo?.status === "processing";

  const { data: polledVideo } = usePollVideoStatus(id, {
    query: {
      enabled: isPolling && !!id,
      refetchInterval: 3000,
      queryKey: getPollVideoStatusQueryKey(id)
    }
  });

  const video = polledVideo || initialVideo;
  const previousStatus = useRef(video?.status);

  useEffect(() => {
    if (polledVideo && previousStatus.current !== polledVideo.status) {
      if (polledVideo.status === "succeeded" || polledVideo.status === "failed") {
        queryClient.invalidateQueries({ queryKey: getGetVideoQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVideoStatsQueryKey() });
      }
      previousStatus.current = polledVideo.status;
    }
  }, [polledVideo, id, queryClient]);

  const deleteVideo = useDeleteVideo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVideoStatsQueryKey() });
        toast({ title: "Video deleted successfully" });
        setLocation("/");
      },
      onError: (error) => {
        toast({ title: "Failed to delete video", description: error.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-5xl flex-grow flex flex-col">
          <Skeleton className="w-full aspect-video rounded-xl mb-8" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-24 w-full mb-8" />
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Video not found</h2>
        <Link href="/" className="text-primary hover:underline">Return to Studio</Link>
      </div>
    );
  }

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
    if (video.status === "succeeded" && video.videoUrl) {
      return (
        <video 
          src={video.videoUrl} 
          autoPlay 
          loop 
          controls
          className="w-full h-full object-contain bg-black rounded-xl shadow-2xl shadow-black/80 ring-1 ring-border"
        />
      );
    }
    
    if (video.status === "starting" || video.status === "processing") {
      return (
        <div className="w-full aspect-video flex flex-col items-center justify-center bg-card/50 rounded-xl border border-border ring-1 ring-border shadow-2xl shadow-black/50 text-muted-foreground gap-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-lg font-mono uppercase tracking-widest text-primary/90">
              {video.status === "starting" ? "INITIALIZING" : "RENDERING"}
            </span>
            <span className="text-sm font-mono text-muted-foreground max-w-md text-center px-4">
              This usually takes 1-3 minutes depending on length and complexity.
            </span>
          </div>
        </div>
      );
    }

    if (video.status === "failed") {
      return (
        <div className="w-full aspect-video flex flex-col items-center justify-center bg-destructive/10 rounded-xl border border-destructive/20 text-destructive gap-4 shadow-2xl shadow-black/50">
          <AlertCircle className="w-16 h-16" />
          <span className="text-xl font-medium">Generation Failed</span>
          {video.errorMessage && (
            <p className="text-sm text-destructive/80 font-mono max-w-lg text-center px-4 bg-background/50 p-4 rounded border border-destructive/20">
              {video.errorMessage}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full aspect-video flex items-center justify-center bg-card/50 rounded-xl border border-border shadow-2xl text-muted-foreground">
        <Film className="w-16 h-16 opacity-20" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Back to Studio
          </Link>
          <div className="flex items-center gap-4">
            {video.status === 'succeeded' && video.videoUrl && (
              <Button variant="outline" size="sm" asChild className="gap-2 font-mono uppercase tracking-wider text-xs">
                <a href={video.videoUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" /> Download
                </a>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 font-mono uppercase tracking-wider text-xs" disabled={deleteVideo.isPending}>
                  {deleteVideo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this generation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the video and its prompt from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-mono uppercase text-xs tracking-wider">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteVideo.mutate({ id: video.id })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono uppercase text-xs tracking-wider"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl flex-grow flex flex-col">
        <div className="mb-8">
          {renderMedia()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Prompt</h1>
              <p className="text-xl leading-relaxed text-foreground/90 font-medium">
                {video.prompt}
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-card/30 rounded-xl p-6 border border-border/50 backdrop-blur-sm space-y-6">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Status</h3>
                <Badge variant="secondary" className={`font-mono text-sm uppercase tracking-wider border-0 ${getStatusColor(video.status)}`}>
                  {video.status}
                </Badge>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1.5 font-mono"><Film className="w-3 h-3" /> Frames</span>
                    <span className="font-mono text-lg">{video.numFrames}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1.5 font-mono"><PlayCircle className="w-3 h-3" /> FPS</span>
                    <span className="font-mono text-lg">{video.fps}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Timeline</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Created</span>
                    <span className="text-foreground">{format(new Date(video.createdAt), "MMM d, HH:mm:ss")}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Updated</span>
                    <span className="text-foreground">{formatDistanceToNow(new Date(video.updatedAt))} ago</span>
                  </div>
                </div>
              </div>
              
              {video.replicateId && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Job ID</h3>
                  <p className="text-xs font-mono text-muted-foreground break-all bg-background/50 p-2 rounded border border-border/30">
                    {video.replicateId}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
