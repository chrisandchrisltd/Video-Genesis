import { useListVideos, getListVideosQueryKey, usePollVideoStatus, getPollVideoStatusQueryKey, getGetVideoStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { GenerateForm } from "@/components/generate-form";
import { formatDistanceToNow } from "date-fns";
import { VideoGeneration } from "@workspace/api-client-react/src/generated/api.schemas";
import { Link } from "wouter";

function GalleryCard({ video }: { video: VideoGeneration }) {
  const queryClient = useQueryClient();
  const isPolling = video.status === "starting" || video.status === "processing";

  const { data: polledVideo } = usePollVideoStatus(video.id, {
    query: {
      enabled: isPolling,
      refetchInterval: 3000,
      queryKey: getPollVideoStatusQueryKey(video.id),
    },
  });

  const current = polledVideo ?? video;
  const prevStatus = useRef(current.status);

  useEffect(() => {
    if (!polledVideo) return;
    console.log("Status:", polledVideo.status);
    console.log("FULL RESPONSE:", polledVideo);
    if (polledVideo.status === "failed") console.error("FAILED:", polledVideo);
    if (prevStatus.current !== polledVideo.status) {
      if (polledVideo.status === "succeeded" || polledVideo.status === "failed") {
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVideoStatsQueryKey() });
      }
      prevStatus.current = polledVideo.status;
    }
  }, [polledVideo, queryClient]);

  return (
    <Link href={`/video/${current.id}`}>
      <div className="bg-[#111827] p-3 rounded-xl cursor-pointer hover:ring-1 hover:ring-blue-500 transition-all">
        <div className="h-40 bg-gray-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
          {current.status === "succeeded" && current.videoUrl ? (
            <video
              src={current.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : current.status === "starting" || current.status === "processing" ? (
            <div className="flex flex-col items-center gap-2 text-blue-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono uppercase tracking-widest animate-pulse">
                {current.status === "starting" ? "Starting..." : "Rendering..."}
              </span>
            </div>
          ) : current.status === "failed" ? (
            <span className="text-red-400 text-sm">Failed</span>
          ) : (
            <span className="text-gray-600 text-sm">No preview</span>
          )}
        </div>
        <p className="text-sm text-gray-400 line-clamp-2">{current.prompt}</p>
        <p className="text-xs text-gray-600 mt-1 font-mono">
          {formatDistanceToNow(new Date(current.createdAt))} ago · {current.status}
        </p>
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: videoList, isLoading } = useListVideos(undefined, {
    query: { queryKey: getListVideosQueryKey() },
  });

  const [isPremium, setIsPremium] = useState(() => localStorage.getItem("premium") === "true");
  const [expiryDate, setExpiryDate] = useState<string | null>(() => localStorage.getItem("expiry"));

  const unlockPremium = (expiry?: string | null) => {
    setIsPremium(true);
    localStorage.setItem("premium", "true");
    if (expiry) {
      setExpiryDate(expiry);
      localStorage.setItem("expiry", expiry);
    }
    window.history.replaceState({}, "", "/");
  };

  useEffect(() => {
    function checkSubscription() {
      const premium = localStorage.getItem("premium");
      const expiry = localStorage.getItem("expiry");

      if (premium === "true" && expiry) {
        if (Date.now() > parseInt(expiry)) {
          localStorage.removeItem("premium");
          localStorage.removeItem("expiry");
          setIsPremium(false);
          setExpiryDate(null);
          alert("Your subscription has expired");
          window.location.href = "/";
        }
      }
    }

    checkSubscription();

    const params = new URLSearchParams(window.location.search);
    const isPremiumParam = params.get("premium");
    const expiry = params.get("expiry");

    if (isPremiumParam === "true" && expiry) {
      localStorage.setItem("premium", "true");
      localStorage.setItem("expiry", expiry);
      setIsPremium(true);
      setExpiryDate(expiry);
      window.history.replaceState({}, "", "/");
      return;
    }

    const email = localStorage.getItem("userEmail") || "customer@email.com";
    fetch(`/api/me?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(user => {
        if (user.plan === "premium") {
          const expiryMs = user.expiryDate ? String(new Date(user.expiryDate).getTime()) : null;
          unlockPremium(expiryMs);
        } else {
          setIsPremium(false);
          localStorage.removeItem("premium");
          localStorage.removeItem("expiry");
        }
      })
      .catch(() => {});
  }, []);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Payment link failed");
      }
    } catch (err) {
      console.error(err);
      alert("Payment error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white px-4 py-6 max-w-2xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-blue-400">🎬 MotionVerse AI</h1>
        <div className="flex flex-col items-end gap-1">
          <button
            id="upgradeBtn"
            onClick={() => !isPremium && handleUpgrade()}
            style={{
              background: localStorage.getItem("premium") === "true" ? "gold" : "#2563eb",
              color: localStorage.getItem("premium") === "true" ? "#000" : "#fff",
            }}
            className="px-4 py-2 rounded-xl text-sm shadow-lg font-semibold"
          >
            {localStorage.getItem("premium") === "true" ? "⭐ Premium" : "⭐ Upgrade"}
          </button>
          {isPremium && expiryDate && (() => {
            const daysLeft = Math.ceil((Number(expiryDate) - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <span id="status" className="text-[10px] text-yellow-600">
                Premium active ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
              </span>
            );
          })()}
        </div>
      </div>

      {/* FORM */}
      <GenerateForm isPremium={isPremium} />

      {/* GALLERY */}
      <div className="mt-8">
        <h2 className="text-lg mb-3">
          Recent Generations
          {videoList?.total ? (
            <span className="text-sm text-gray-500 ml-2 font-normal">{videoList.total} total</span>
          ) : null}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#111827] p-3 rounded-xl animate-pulse">
                <div className="h-40 bg-gray-800 rounded-lg mb-2" />
                <div className="h-4 bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : videoList?.videos.length === 0 ? (
          <div className="bg-[#111827] p-8 rounded-xl text-center text-gray-500 text-sm">
            Your generated videos will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {videoList?.videos.map(video => (
              <GalleryCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
