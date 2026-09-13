import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

interface InboundLogDetail {
  id: string;
  request_id: string;
  method: string;
  path: string;
  source_ip: string;
  user_agent: string;
  response_status: number;
  duration_ms: number;
  created_at: string;
  request_headers_json: unknown;
  request_body_json: unknown;
  response_headers_json: unknown;
}

export default function InboundLogDetail({ tenantId }: { tenantId?: string }) {
  const params = useParams<{ tenantId?: string; logId?: string }>();
  const tid = tenantId ?? params.tenantId ?? "";
  const logId = params.logId;
  const [log, setLog] = useState<InboundLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tid || !logId) return;

    const fetchLog = async () => {
      setLoading(true);
      try {
        const j = await apiFetch(`/api/v1/tenants/${tid}/inbound/${logId}`, {
          method: "GET",
        });

        setLog(j.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch log");
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [tid, logId]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "var(--success)";
    if (status >= 400 && status < 500) return "var(--warning)";
    if (status >= 500) return "var(--danger)";
    return "var(--text-muted)";
  };

  const formatJson = (v: unknown) => {
    try {
      const parsed = typeof v === "string" ? JSON.parse(v) : v;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(v ?? "");
    }
  };

  if (loading) return <div className="pl-card">Loading log details...</div>;
  if (error) return <div className="pl-card">Error: {error}</div>;
  if (!log) return <div className="pl-card">Log not found</div>;

  return (
    <div className="pl-content">
      <div className="pl-top">
        <div>
          <h1>Log Details</h1>
          <p>Detailed view of API request and response</p>
        </div>
        <div>
          <Link to="/inbound" className="pl-btn pl-btn-ghost">
            ← Back to Logs
          </Link>
        </div>
      </div>

      <div className="pl-grid">
        <div className="pl-card">
          <h2>Request Summary</h2>
          <div className="pl-detail-grid">
            <div>
              <label>Request ID</label>
              <p>{log.request_id}</p>
            </div>
            <div>
              <label>Method</label>
              <p>
                <span className="pl-method pl-method-{log.method.toLowerCase()}">
                  {log.method}
                </span>
              </p>
            </div>
            <div>
              <label>Path</label>
              <p className="pl-text-truncate">{log.path}</p>
            </div>
            <div>
              <label>Status</label>
              <p>
                <span
                  className="pl-status"
                  style={{ color: getStatusColor(log.response_status) }}
                >
                  {log.response_status}
                </span>
              </p>
            </div>
            <div>
              <label>Duration</label>
              <p>{formatDuration(log.duration_ms)}</p>
            </div>
            <div>
              <label>Source IP</label>
              <p>{log.source_ip}</p>
            </div>
            <div>
              <label>User Agent</label>
              <p className="pl-text-truncate">{log.user_agent || "-"}</p>
            </div>
            <div>
              <label>Timestamp</label>
              <p>{formatDate(log.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="pl-card">
          <h2>Request Headers</h2>
          <pre className="pl-json">
            {formatJson(log.request_headers_json)}
          </pre>
        </div>

        <div className="pl-card">
          <h2>Request Body</h2>
          <pre className="pl-json">
            {formatJson(log.request_body_json)}
          </pre>
        </div>

        <div className="pl-card">
          <h2>Response Headers</h2>
          <pre className="pl-json">
            {formatJson(log.response_headers_json)}
          </pre>
        </div>
      </div>
    </div>
  );
}