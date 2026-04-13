import { useRef, useState } from "react";
import { getListVideosQueryKey, getGetVideoStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const IMGBB_API_KEY = "6a50b722abc5dd5b856037118adb532f";

type Mode = "image-video" | "text-video" | "text-image";

const MODES: { key: Mode; label: string }[] = [
  { key: "image-video", label: "🎭 Animate" },
  { key: "text-video", label: "🧠 Text → Video" },
  { key: "text-image", label: "🎨 Text → Image" },
];

const QUICK_PROMPTS = ["Dance", "Smile", "Look Around", "Cinematic"];

async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error("Image upload failed");
  return data.data.display_url as string;
}

async function addWatermark(url: string, label: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(24, Math.floor(canvas.width / 12));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);

      const step = fontSize * 4;
      for (let y = -canvas.height; y < canvas.height; y += step) {
        for (let x = -canvas.width; x < canvas.width; x += step) {
          ctx.strokeText(label, x, y);
          ctx.fillText(label, x, y);
        }
      }
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

async function pollUntilDone(predictionId: string): Promise<string> {
  while (true) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`/api/predictions/${predictionId}`);
    const data = await res.json();
    console.log("Status:", data.status);
    console.log("FULL RESPONSE:", data);
    if (data.status === "succeeded") {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      return output as string;
    }
    if (data.status === "failed") {
      console.error("FAILED:", data);
      throw new Error(data.error || "Generation failed");
    }
  }
}

interface GenerateFormProps {
  isPremium?: boolean;
}

export function GenerateForm({ isPremium = false }: GenerateFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  let resolution: string;
  if (isPremium) {
    resolution = "1080p";
  } else {
    resolution = "720p";
  }

  const [mode, setMode] = useState<Mode>("image-video");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "image" | "video"; url: string } | null>(null);

  const handleModeSwitch = (m: Mode) => {
    setMode(m);
    setResult(null);
    setImage(null);
    setPrompt("");
  };

  const generate = async () => {
    if (localStorage.getItem("premium") !== "true") {
      alert("Upgrade to access this feature");
      window.location.href = "/upgrade";
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (mode === "image-video") {
        if (!image) {
          toast({ title: "Upload an image first", variant: "destructive" });
          setLoading(false);
          return;
        }
        const imageUrl = await uploadToImgbb(image);
        const startRes = await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageUrl, prompt }),
        });
        const startData = await startRes.json();
        if (!startData.id) throw new Error(startData.error || "Failed to start");
        console.log("Status:", startData.status);
        console.log("FULL RESPONSE:", startData);
        setImage(null);
        setPrompt("");
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVideoStatsQueryKey() });
        toast({ title: "Generation started", description: "Your animation is rendering — check the gallery below." });
      } else if (mode === "text-image") {
        if (!prompt.trim()) {
          toast({ title: "Enter a prompt first", variant: "destructive" });
          setLoading(false);
          return;
        }
        const startRes = await fetch("/api/text-to-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-premium": String(isPremium) },
          body: JSON.stringify({ prompt }),
        });
        const startData = await startRes.json();
        if (!startData.id) throw new Error(startData.error || "Failed to start");
        let url = await pollUntilDone(startData.id);
        if (!isPremium) {
          url = await addWatermark(url, "MotionVerse");
        }
        setResult({ type: "image", url });
      } else if (mode === "text-video") {
        if (!prompt.trim()) {
          toast({ title: "Enter a prompt first", variant: "destructive" });
          setLoading(false);
          return;
        }
        const startRes = await fetch("/api/text-to-video", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-premium": String(isPremium) },
          body: JSON.stringify({ prompt }),
        });
        const startData = await startRes.json();
        if (!startData.id) throw new Error(startData.error || "Failed to start");
        const url = await pollUntilDone(startData.id);
        setResult({ type: "video", url });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log("FULL BACKEND ERROR:", err);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const previewSrc = image ? URL.createObjectURL(image) : null;

  return (
    <div>
      {/* MODE SWITCH */}
      <div className="flex gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => handleModeSwitch(m.key)}
            className={`px-3 py-2 rounded-full text-sm transition-colors ${
              mode === m.key
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* PREVIEW AREA */}
      <div className="bg-[#111827] rounded-2xl p-4 mb-4 flex justify-center items-center h-64 overflow-hidden">
        {result?.type === "video" ? (
          <div className="relative h-full">
            <video src={result.url} controls autoPlay loop className="rounded-xl h-full max-w-full" />
            {!isPremium && (
              <div className="absolute bottom-2 right-3 pointer-events-none select-none text-white font-bold opacity-70 text-sm drop-shadow">
                MotionVerse
              </div>
            )}
          </div>
        ) : result?.type === "image" ? (
          <img src={result.url} alt="Generated" className="rounded-xl h-full max-w-full object-contain" />
        ) : previewSrc ? (
          <img src={previewSrc} alt="Preview" className="rounded-xl h-full max-w-full object-contain" />
        ) : (
          <p className="text-gray-500 text-sm">Preview will appear here</p>
        )}
      </div>

      {/* IMAGE UPLOAD */}
      {mode === "image-video" && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-gray-600 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            {image ? `📎 ${image.name}` : "📁 Upload image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setImage(file); setResult(null); }
            }}
          />
        </div>
      )}

      {/* PROMPT INPUT */}
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !loading) generate(); }}
        placeholder="Describe your video..."
        className="w-full p-3 rounded-xl bg-[#111827] border border-gray-700 text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-blue-500"
      />

      {/* QUICK PROMPTS */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm text-gray-300 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* RESOLUTION BADGE + HD OPTION */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
        <span>Resolution:</span>
        <span
          className={`px-2 py-0.5 rounded-full font-semibold ${
            isPremium
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {resolution}
        </span>
        <select
          id="hdOption"
          defaultValue={isPremium ? "hd" : "sd"}
          className={`ml-auto px-2 py-1 rounded-lg text-xs border transition-colors bg-[#111827] cursor-pointer ${
            isPremium
              ? "border-yellow-500/40 text-yellow-300"
              : "border-gray-700 text-gray-400"
          }`}
        >
          <option value="sd">720p</option>
          <option value="hd" disabled={!isPremium}>1080p {!isPremium ? "🔒 Premium" : ""}</option>
        </select>
        {!isPremium && (
          <span className="text-gray-600 text-[10px]">🔒 HD locked</span>
        )}
      </div>

      {/* GENERATE BUTTON */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-white transition-colors"
      >
        {loading ? "⚡ Generating..." : "🎬 Animate"}
      </button>

      {/* LOADING STATE */}
      {loading && (
        <div className="mt-4 text-center text-blue-400 animate-pulse text-sm">
          Rendering your video...
        </div>
      )}
    </div>
  );
}
