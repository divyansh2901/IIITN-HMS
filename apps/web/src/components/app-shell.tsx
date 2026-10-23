import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, ClipboardCheck, DoorOpen, FileText, LayoutDashboard, LogOut, Menu, MessageSquareWarning, Package, Users, X } from "lucide-react";
import type { Role, User } from "../types/api";
import { api } from "../services/api";

const links: { label: string; to: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { label: "Overview", to: "/app/overview", icon: LayoutDashboard, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN"] },
  { label: "Students", to: "/app/students", icon: Users, roles: ["WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"] },
  { label: "Floors & rooms", to: "/app/rooms", icon: DoorOpen, roles: ["WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"] },
  { label: "Leave requests", to: "/app/leave", icon: ClipboardCheck, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD"] },
  { label: "Hostel requests", to: "/app/requests", icon: ClipboardCheck, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD"] },
  { label: "Complaints", to: "/app/complaints", icon: MessageSquareWarning, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN", "STAFF"] },
  { label: "Equipment", to: "/app/equipment", icon: Package, roles: ["STUDENT", "GUARD"] },
  { label: "Notices", to: "/app/notices", icon: FileText, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"] },
  { label: "Notifications", to: "/app/notifications", icon: Bell, roles: ["STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"] }
];

export function AppShell({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const allowed = links.filter((link) => link.roles.some((role) => user.roles.includes(role)));
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ notifications: { readAt?: string | null }[]; unreadCount: number }>("/notifications"), staleTime: 15_000 });
  return <div className="shell"><aside className={open ? "sidebar mobile-open" : "sidebar"}><div className="brand"><span className="brand-mark"><Building2 size={21} /></span><div><strong>IIITN HMS</strong><small>Hostel operations</small></div><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button></div><nav>{allowed.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><div className="user-mini"><span className="avatar">{user.fullName.charAt(0)}</span><div><strong>{user.fullName}</strong><small>{user.roles.join(" · ")}</small></div></div><button className="logout" onClick={async () => { await onLogout(); navigate("/login"); }}><LogOut size={16} /> Sign out</button></div></aside><main className="main"><header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-context"><span className="dot" />Live hostel records</div><NavLink to="/app/notifications" className="notification-button" aria-label="Open notifications"><Bell size={18} />{Boolean(notifications.data?.unreadCount) && <span className="notification-count">{notifications.data?.unreadCount}</span>}</NavLink><span className="topbar-role">{user.roles.join(" / ")}</span></header><Outlet /></main></div>;
}
