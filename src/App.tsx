import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
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
import SeriesRedirect from "./pages/SeriesRedirect";
import CategoryWing from "./pages/CategoryWing";
import CityWing from "./pages/CityWing";
import TagWing from "./pages/TagWing";

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
            <Route path="/wing/:category" element={<CategoryWing />} />
            <Route path="/city/:city" element={<CityWing />} />
            <Route path="/topic/:tag" element={<TagWing />} />
            <Route path="/competition/:slug" element={<CompetitionDetail />} />
            <Route path="/competition/id/:id" element={<CompetitionDetail />} />
            <Route path="/series/:seriesSlug" element={<SeriesRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/entrance" element={<Entrance />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/vault/upload" element={<BulkUpload />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
