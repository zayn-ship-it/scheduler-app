/**
 * main.tsx
 * ---------------------------------------------------------------------------
 * App entry point. Mounts the React tree into the #root element declared in
 * index.html, wrapped in the browser router (so URLs like /backoffice and
 * /schedule/:id work) and the shadcn Tooltip provider (required by any
 * component that uses shadcn's Tooltip, e.g. drag/resize hints).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
);
