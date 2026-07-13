export type ServerPreflightResult = {
  ok: true;
  operation: "create" | "replace";
  message: string;
};

export type PreflightState =
  | {
      status: "idle";
      tone: "neutral";
      title: string;
      detail: string;
      items?: string[];
    }
  | {
      status: "pending";
      tone: "warning";
      title: string;
      detail: string;
      items?: string[];
    }
  | {
      status: "parse-error" | "invalid" | "server-error";
      tone: "error";
      title: string;
      detail: string;
      items?: string[];
    }
  | {
      status: "ready" | "unavailable";
      tone: "success" | "warning";
      title: string;
      detail: string;
      items?: string[];
      operation?: "create" | "replace";
    };
