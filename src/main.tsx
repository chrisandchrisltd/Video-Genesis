import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!localStorage.getItem("premium")) {
  localStorage.setItem("premium", "false");
}

function validatePremium() {
  const premium = localStorage.getItem("premium");
  const expiry = localStorage.getItem("expiry");

  if (premium === "true") {
    if (!expiry || Date.now() > parseInt(expiry)) {
      localStorage.setItem("premium", "false");
      localStorage.removeItem("expiry");
    }
  }
}

validatePremium();

console.log("Premium:", localStorage.getItem("premium"));
console.log("Expiry:", localStorage.getItem("expiry"));

const exempt = ["/upgrade", "/success"];
const onExemptPage = exempt.some(p => window.location.pathname.endsWith(p));

if (!onExemptPage) {
  const premium = localStorage.getItem("premium");
  if (!premium) {
    window.location.href = "/upgrade";
  }
}

createRoot(document.getElementById("root")!).render(<App />);
