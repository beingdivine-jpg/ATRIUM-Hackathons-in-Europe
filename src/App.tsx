import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Entrance from "./pages/Entrance";
import Vault from "./pages/Vault";
import NotFound from "./pages/NotFound";
import BulkUpload from "./pages/BulkUpload";
import CompetitionDetail from "./pages/CompetitionDetail";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/competition/:slug" element={<CompetitionDetail />} />
            {/* Legacy ID-based route for backward compatibility */}
            <Route path="/competition/id/:id" element={<CompetitionDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/entrance" element={<Entrance />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/vault/upload" element={<BulkUpload />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
