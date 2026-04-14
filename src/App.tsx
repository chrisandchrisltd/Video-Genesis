import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "./toaster";
import { TooltipProvider } from "./tooltip";

import NotFound from "./not-found";
import Home from "./home";
import VideoDetail from "./video-detail";
import Success from "./success";
import Upgrade from "./upgrade";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/video/:id" component={VideoDetail} />
      <Route path="/success" component={Success} />
      <Route path="/upgrade" component={Upgrade} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
