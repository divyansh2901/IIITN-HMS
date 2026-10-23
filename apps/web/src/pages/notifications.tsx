import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button, Card, Empty, Page, Status } from "../components/ui";
import { ErrorMessage, Loading, SuccessMessage } from "../components/feedback";
import { api, ApiError } from "../services/api";
import type { Notification } from "../types/api";
import { useQueryClient } from "@tanstack/react-query";

export function NotificationsPage() {
  const queryClient = useQueryClient(); const [items, setItems] = useState<Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const load = async () => { try { setLoading(true); setError(""); const result = await api<{ notifications: Notification[]; unreadCount: number }>("/notifications"); setItems(result.notifications); queryClient.setQueryData(["notifications"], result); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to load notifications"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const markRead = async (id: string) => { try { await api(`/notifications/${id}/read`, { method: "PATCH" }); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to mark notification as read"); } };
  const markAll = async () => { try { await api("/notifications/read-all", { method: "PATCH" }); setSuccess("Notifications marked as read."); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to update notifications"); } };
  return <Page title="Notifications" description="Status changes and overdue equipment reminders for your account." actions={<Button variant="secondary" onClick={() => void markAll()}><CheckCheck size={16} /> Mark all as read</Button>}>{error && <ErrorMessage message={error} />}{success && <SuccessMessage message={success} />}<Card>{loading ? <Loading /> : !items.length ? <Empty title="No notifications" detail="Important hostel updates will appear here." /> : <div className="notification-list">{items.map((item) => <div className={item.readAt ? "notification-item read" : "notification-item unread"} key={item.id}><span className="icon-box"><Bell size={16} /></span><div><div className="leave-title"><strong>{item.title}</strong>{!item.readAt && <Status>UNREAD</Status>}</div><p>{item.message}</p><small className="muted">{new Date(item.createdAt).toLocaleString("en-IN")}</small></div>{!item.readAt && <Button variant="ghost" onClick={() => void markRead(item.id)}>Mark read</Button>}</div>)}</div>}</Card></Page>;
}
