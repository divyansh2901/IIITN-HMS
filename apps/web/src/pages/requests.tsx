import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardList, Clock3, X } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { Button, Card, Empty, Input, Page, Status } from "../components/ui";
import { ErrorMessage, Loading, SuccessMessage } from "../components/feedback";
import { api, ApiError, json } from "../services/api";
import type { HostelRequest, RequestType } from "../types/api";

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const statusLabel = (status: string) => status.replaceAll("_", " ");
const waitingTime = (value: string) => { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 60 ? `${minutes}m waiting` : `${Math.floor(minutes / 60)}h ${minutes % 60}m waiting`; };

export function RequestsPage() {
  const { user } = useAuth();
  const isStudent = user?.roles.includes("STUDENT");
  const isGuard = user?.roles.includes("GUARD");
  const [requests, setRequests] = useState<HostelRequest[]>([]);
  const [types, setTypes] = useState<RequestType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selected, setSelected] = useState<HostelRequest | null>(null);
  const [search, setSearch] = useState(""); const [filterType, setFilterType] = useState(""); const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ title: "", description: "", departureAt: "", expectedReturnAt: "", destination: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedType = useMemo(() => types.find((type) => type.id === selectedTypeId), [types, selectedTypeId]);
  const load = async () => {
    try {
      setLoading(true); setError("");
      const typeResult = await api<{ requestTypes: RequestType[] }>("/requests/types");
      setTypes(typeResult.requestTypes);
      if (!selectedTypeId && typeResult.requestTypes[0]) setSelectedTypeId(typeResult.requestTypes[0].id);
      if (isStudent) setRequests((await api<{ requests: HostelRequest[] }>("/requests/my")).requests);
      else { const params = new URLSearchParams(); if (search) params.set("q", search); if (filterType) params.set("requestTypeId", filterType); if (filterStatus) params.set("status", filterStatus); const queue = isGuard ? "/requests/guard/pending" : "/requests/admin/pending"; setRequests((await api<{ requests: HostelRequest[] }>(`${queue}?${params.toString()}`)).requests); }
    } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to load requests"); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [isStudent, isGuard, search, filterType, filterStatus]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try { setBusy(true); setError(""); const details = selectedType?.requiresLeaveDetails ? { departureAt: form.departureAt, expectedReturnAt: form.expectedReturnAt, destination: form.destination } : {}; await api("/requests", json({ requestTypeId: selectedTypeId, title: form.title, description: form.description, ...details })); setSuccess("Request submitted successfully. It is now waiting for guard review."); setForm({ title: "", description: "", departureAt: "", expectedReturnAt: "", destination: "" }); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Unable to submit request"); } finally { setBusy(false); }
  };
  const action = async (request: HostelRequest, kind: "approve" | "reject" | "start" | "complete" | "adminReject") => {
    const confirmed = window.confirm(kind === "approve" ? "Approve and forward this request to the administrator?" : kind === "complete" ? "Mark this request as completed?" : "Continue with this request action?");
    if (!confirmed) return;
    const prompt = kind === "reject" || kind === "adminReject" ? "Enter the rejection reason:" : kind === "complete" ? "Enter completion notes or final outcome:" : "Optional remarks:";
    const value = window.prompt(prompt, "");
    if ((kind === "reject" || kind === "adminReject" || kind === "complete") && !value?.trim()) return;
    const path = isGuard ? `/requests/guard/${request.id}/${kind === "approve" ? "approve-forward" : "reject"}` : `/requests/admin/${request.id}/${kind === "adminReject" ? "reject" : kind}`;
    const body = kind === "reject" || kind === "adminReject" ? { reason: value } : kind === "complete" ? { completionNotes: value } : { remarks: value || undefined };
    try { setBusy(true); await api(path, json(body)); setSuccess(kind === "approve" ? "Request approved and forwarded to the administrator." : "Request updated successfully."); await load(); if (selected?.id === request.id) setSelected(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Unable to update request"); } finally { setBusy(false); }
  };

  return <Page title={isStudent ? "My requests" : isGuard ? "Pending student requests" : "Administrator requests"} description={isStudent ? "Submit hostel requests and follow every guard and administrator decision." : isGuard ? "Review student submissions and forward approved requests to the administrator." : "Process requests forwarded by the guard and record the final outcome."}>
    {error && <ErrorMessage message={error} />}{success && <SuccessMessage message={success} />}
    {isStudent && <Card className="form-card"><div className="section-heading"><div><h2>New request</h2><p>Request reference and submission timestamp are generated by the server.</p></div><ClipboardList size={20} /></div><form className="form-grid" onSubmit={submit}><label>Request type<select className="input" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} required><option value="">Choose request type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Subject or short title<Input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="wide">Description or reason<textarea required minLength={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>{selectedType?.requiresLeaveDetails && <><label>Departure date & time<Input type="datetime-local" required value={form.departureAt} onChange={(e) => setForm({ ...form, departureAt: e.target.value })} /></label><label>Expected return date & time<Input type="datetime-local" required value={form.expectedReturnAt} onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })} /></label><label className="wide">Destination<Input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label></>}<div className="wide"><Button type="submit" loading={busy}>Submit request</Button></div></form></Card>}
    {!isStudent && <Card className="toolbar request-filters"><div><label htmlFor="request-search">Search requests</label><Input id="request-search" aria-label="Search requests" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Reference, enrollment, or name…" /></div><div><label htmlFor="request-type-filter">Request type</label><select id="request-type-filter" className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="">All types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>{!isGuard && <div><label htmlFor="request-status-filter">Status</label><select id="request-status-filter" className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">Forwarded and in progress</option><option value="FORWARDED_TO_ADMIN">Forwarded to admin</option><option value="IN_PROGRESS">In progress</option></select></div>}<Clock3 size={18} /></Card>}
    <Card className="table-card"><div className="section-heading"><div><h2>{isStudent ? "Request history" : "Queue"}</h2><p>{isGuard ? "Guard approval is intermediate; only the administrator can complete a request." : !isStudent ? "Requests are shown only at the stage your role can act on." : "The timeline below reflects persisted workflow history."}</p></div></div>{loading ? <Loading /> : !requests.length ? <Empty title="No requests found" detail={isStudent ? "Your submitted requests will appear here." : "There are no requests awaiting your action."} /> : <div className="request-list">{requests.map((request) => <div className="request-item" key={request.id}><div className="request-main"><div className="leave-title"><strong>{request.referenceNumber}</strong><Status>{request.status}</Status></div><h3>{request.title}</h3><p>{request.description}</p><div className="leave-meta"><span>{request.requestType.name}</span><span>{request.student?.user.fullName || "You"}</span><span>Submitted {formatDate(request.createdAt)}</span>{!isStudent && <span>{waitingTime(request.createdAt)}</span>}</div></div><div className="action-row"><Button variant="secondary" onClick={() => setSelected(selected?.id === request.id ? null : request)}>View details</Button>{isGuard && request.status === "PENDING_GUARD_REVIEW" && <><Button onClick={() => void action(request, "approve")} disabled={busy}><Check size={15} /> Approve & forward</Button><Button variant="danger" onClick={() => void action(request, "reject")} disabled={busy}><X size={15} /> Reject</Button></>}{!isStudent && !isGuard && request.status === "FORWARDED_TO_ADMIN" && <Button onClick={() => void action(request, "start")} disabled={busy}>Start processing</Button>}{!isStudent && !isGuard && request.status === "IN_PROGRESS" && <><Button onClick={() => void action(request, "complete")} disabled={busy}><Check size={15} /> Mark completed</Button><Button variant="danger" onClick={() => void action(request, "adminReject")} disabled={busy}><X size={15} /> Reject</Button></>}</div>{selected?.id === request.id && <RequestDetails request={request} />}</div>)}</div>}</Card>
  </Page>;
}

function RequestDetails({ request }: { request: HostelRequest }) { return <div className="request-details"><div className="detail-grid"><div><span>Student</span><strong>{request.student?.user.fullName || "You"}</strong></div><div><span>Enrollment</span><strong>{request.student?.enrollmentNumber || "—"}</strong></div><div><span>Destination</span><strong>{request.destination || "—"}</strong></div><div><span>Departure</span><strong>{formatDate(request.departureAt)}</strong></div><div><span>Expected return</span><strong>{formatDate(request.expectedReturnAt)}</strong></div><div><span>Guard reviewer</span><strong>{request.guardReviewer?.fullName || "Pending"}</strong></div></div><div className="timeline">{request.history.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-marker" /><div><strong>{statusLabel(event.newStatus)}</strong><small>{event.actor?.fullName || "System"} · {formatDate(event.createdAt)}</small>{event.remarks && <p>{event.remarks}</p>}</div></div>)}</div>{request.rejectionReason && <div className="feedback error">Rejection reason: {request.rejectionReason}</div>}{request.completionNotes && <div className="feedback success">Completion notes: {request.completionNotes}</div>}<div className="request-next"><ArrowRight size={16} />{request.status === "PENDING_GUARD_REVIEW" ? "Next action: guard review" : request.status === "FORWARDED_TO_ADMIN" ? "Next action: administrator processing" : request.status === "IN_PROGRESS" ? "Next action: administrator completion" : "Workflow stage complete"}</div></div>; }
