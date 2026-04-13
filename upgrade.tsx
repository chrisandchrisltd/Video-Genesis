export default function Upgrade() {
  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/pay", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Payment link failed. Please try again.");
      }
    } catch {
      alert("Payment error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">🎬 MotionVerse AI</h1>
        <p className="text-gray-400 mb-8">Unlock the full power of AI video generation</p>

        <div
          className="rounded-2xl p-8 mb-6 border border-yellow-500/30"
          style={{ background: "linear-gradient(135deg, #1a1400, #0B0F14)" }}
        >
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: "linear-gradient(45deg, gold, orange)", color: "#000" }}
          >
            ⭐ Premium Plan
          </div>

          <div className="text-4xl font-bold mb-1">₦2,000</div>
          <div className="text-gray-400 text-sm mb-6">per 30 days</div>

          <ul className="text-left space-y-3 mb-8 text-sm text-gray-300">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 1080p HD generation</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> No watermark on outputs</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 50 generation credits</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> All three generation modes</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Priority rendering</li>
          </ul>

          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded-xl font-bold text-black text-base transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(45deg, gold, orange)", boxShadow: "0 0 16px gold" }}
          >
            Upgrade Now
          </button>
        </div>

        <a href="/" className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
          ← Continue with free plan
        </a>
      </div>
    </div>
  );
}
