import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, HTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

export const Button = ({ children, loading, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost" }) => <button className={`button button-${variant} ${className}`} disabled={props.disabled || loading} {...props}>{loading && <LoaderCircle size={16} className="spin" />}{children}</button>;
export const Card = ({ children, className = "", ...props }: PropsWithChildren<{ className?: string } & HTMLAttributes<HTMLElement>>) => <section className={`card ${className}`} {...props}>{children}</section>;
export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...props} />;
export const Status = ({ children }: PropsWithChildren) => <span className={`status status-${String(children).toLowerCase().replaceAll("_", "-")}`}>{String(children).replaceAll("_", " ")}</span>;
export const Empty = ({ title, detail }: { title: string; detail: string }) => <div className="empty"><strong>{title}</strong><span>{detail}</span></div>;
export const Page = ({ title, description, actions, children }: PropsWithChildren<{ title: string; description?: string; actions?: React.ReactNode }>) => <div className="page"><div className="page-heading"><div><p className="eyebrow">IIITN HOSTEL MANAGEMENT SYSTEM</p><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{actions}</div>{children}</div>;
