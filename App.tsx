import { Switch, Route, Router as WouterRouter } from "wouter"; import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; import { Toaster } from "./components/ui/toaster"; import { TooltipProvider } from "./components/ui/tooltip"; import NotFound from "./pages/not-found"; import Home from "./pages/home"; import VideoDetail from "./pages/video-detail"; import Success from "./pages/success"; import Upgrade from "./pages/upgrade";
const queryClient = new QueryClient();
function Router() { return (        ); }
function App() { return (   <WouterRouter base={import.meta.env.BASE_URL.replace(//$/, "")}>      ); }
export default App;
