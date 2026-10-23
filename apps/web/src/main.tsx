import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { AuthProvider, Protected, useAuth } from "./components/auth-context";
import { LoginPage } from "./pages/login";
import { OverviewPage } from "./pages/overview";
import { RoomsPage } from "./pages/rooms";
import { StudentsPage } from "./pages/students";
import { LeavePage } from "./pages/leave";
import { ComplaintsPage } from "./pages/complaints";
import { EquipmentPage } from "./pages/equipment";
import { NoticesPage } from "./pages/notices";
import { ForbiddenPage } from "./pages/forbidden";
import "./index.css";
import { queryClient } from "./services/query";

function ShellRoute() { const { user, signOut } = useAuth(); return user ? <AppShell user={user} onLogout={signOut} /> : null; }
function App() { return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/forbidden" element={<ForbiddenPage />} /><Route path="/app" element={<Protected><ShellRoute /></Protected>}><Route index element={<Navigate to="overview" replace />} /><Route path="overview" element={<OverviewPage />} /><Route path="rooms" element={<Protected roles={["WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"]}><RoomsPage /></Protected>} /><Route path="students" element={<Protected roles={["WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"]}><StudentsPage /></Protected>} /><Route path="leave" element={<Protected roles={["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD"]}><LeavePage /></Protected>} /><Route path="complaints" element={<Protected roles={["STUDENT", "WARDEN", "SUPER_ADMIN", "STAFF"]}><ComplaintsPage /></Protected>} /><Route path="equipment" element={<Protected roles={["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"]}><EquipmentPage /></Protected>} /><Route path="notices" element={<Protected><NoticesPage /></Protected>} /></Route><Route path="/" element={<Navigate to="/app/overview" replace />} /><Route path="*" element={<Navigate to="/app/overview" replace />} /></Routes></AuthProvider>; }

createRoot(document.getElementById("root")!).render(<StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></StrictMode>);
