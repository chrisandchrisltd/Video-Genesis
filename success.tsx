import { useEffect, useState } from "react";

export default function Success() {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [details, setDetails] = useState<{ amount?: number; email?: string } | null>(null);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");

    if (!reference) {
      setStatus("failed");
      return;
    }

    fetch(`/api/verify?reference=${reference}`)
      .then(res => res.json())
      .then(data => {
        console.log("VERIFY RESPONSE:", data);
        if (data.status && data.data?.status === "success") {
          setDetails({
            amount: data.data.amount / 100,
            email: data.data.customer?.email,
          });
          setStatus("success");
        } else {
          setStatus("failed");
        }
      })
      .catch(err => {
        console.error("VERIFY ERROR:", err);
        setStatus("failed");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {status === "loading" && (
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Verifying payment...</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">✅ Payment Successful</h1>
          {details && (
            <div className="text-gray-400 text-sm space-y-1">
              {details.email && <p>{details.email}</p>}
              {details.amount && <p>₦{details.amount.toLocaleString()}</p>}
            </div>
          )}
          <a href="/" className="inline-block mt-4 bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-xl text-sm transition-colors">
            Back to App
          </a>
        </div>
      )}

      {status === "failed" && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">❌ Payment Failed</h1>
          <p className="text-gray-400 text-sm">We could not verify your payment.</p>
          <a href="/" className="inline-block mt-4 bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-sm transition-colors">
            Back to App
          </a>
        </div>
      )}
    </div>
  );
}
