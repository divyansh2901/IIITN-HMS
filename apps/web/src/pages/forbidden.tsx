import { Link } from "react-router-dom";
export function ForbiddenPage() { return <div className="full-loading"><div><p className="eyebrow">403 / FORBIDDEN</p><h1>That area is restricted.</h1><p className="muted">Your role does not have access to this operation.</p><Link className="button button-primary" to="/app/overview">Return to overview</Link></div></div>; }
