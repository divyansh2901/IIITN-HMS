import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { Button, Input } from "../components/ui";
import { ErrorMessage } from "../components/feedback";

type Form = { email: string; password: string };
export function LoginPage() {
  const { user, signIn } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ defaultValues: { email: "", password: "" } });
  if (user) return <Navigate to="/app/overview" replace />;
  const submit = async (values: Form) => { try { setError(""); await signIn(values.email, values.password); navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/app/overview", { replace: true }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in"); } };
  return <div className="login-page"><div className="login-panel"><div className="login-brand"><span className="brand-mark large"><Building2 size={26} /></span><div><strong>IIITN HMS</strong><span>Hostel Management System</span></div></div><div className="login-copy"><p className="eyebrow">SECURE INSTITUTIONAL ACCESS</p><h1>Welcome back.</h1><p>Sign in to manage hostel services, room records, and student operations.</p></div><form onSubmit={handleSubmit(submit)} className="form-stack"><label>Email address<span className="input-icon"><Mail size={16} /><Input type="email" autoComplete="email" placeholder="you@iiitn.ac.in" {...register("email", { required: "Email is required" })} /></span>{errors.email && <small className="field-error">{errors.email.message}</small>}</label><label>Password<span className="input-icon"><LockKeyhole size={16} /><Input type="password" autoComplete="current-password" placeholder="Enter your password" {...register("password", { required: "Password is required", minLength: { value: 8, message: "Use at least 8 characters" } })} /></span>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>{error && <ErrorMessage message={error} />}<Button type="submit" loading={isSubmitting} className="full-button">Sign in securely</Button></form><p className="login-note">Development environment · Session protected by an HTTP-only cookie</p></div><div className="login-aside"><div className="aside-grid" /><div><p className="eyebrow">HOSTEL OPERATIONS / IIIT NAGPUR</p><h2>One clear view of the hostel.</h2><p>Rooms, leave, complaints, equipment, and notices connected to the records that matter.</p></div><div className="aside-meta"><span>10 floors</span><span>Real-time records</span><span>Role-aware access</span></div></div></div>;
}
