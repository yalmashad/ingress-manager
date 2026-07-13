import type { PreflightState } from "./preflight";

export function PreflightPanel({ state }: { state: PreflightState | null }) {
  if (!state) return null;

  return (
    <div className={`preflight-panel ${state.tone}`}>
      <div className="preflight-header">
        <strong>{state.title}</strong>
        {state.operation ? <span className="preflight-badge">{state.operation === "create" ? "Create" : "Update"}</span> : null}
      </div>
      <p>{state.detail}</p>
      {state.items?.length ? (
        <ul className="preflight-list">
          {state.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
