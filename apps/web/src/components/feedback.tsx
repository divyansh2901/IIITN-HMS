import { AlertCircle, CheckCircle2 } from "lucide-react";

export const ErrorMessage = ({ message }: { message: string }) => <div className="feedback error"><AlertCircle size={18} /><span>{message}</span></div>;
export const SuccessMessage = ({ message }: { message: string }) => <div className="feedback success"><CheckCircle2 size={18} /><span>{message}</span></div>;
export const Loading = () => <div className="loading"><span className="loader" />Loading current records…</div>;
