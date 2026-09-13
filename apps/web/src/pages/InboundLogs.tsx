import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

interface InboundLog {
  id: string;
  request_id: string;
  method: string;
  path: string;
  source_ip: string;
  user_agent: string;
  response_status: number;
  duration_ms: number;
  created_at: string;
}

export default function InboundLogs({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<InboundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0 });
  const [filters, setFilters] = useState({ method: "", status: "" });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(filters.method && { method: filters.method }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await apiFetch(`/api/v1/tenants/${tenantId}/inbound?${params}`, {
        method: "GET",
      });

      setLogs(response.data);
      setPagination(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantId, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ method: "", status: "" });
  };

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

  if (loading) return <div className="pl-card">Loading inbound logs...</div>;
  if (error) return <div className="pl-card">Error: {error}</div>;

  return (
    <div className="pl-content">
      <div className="pl-top">
        <div>
          <h1>Inbound Logs</h1>
          <p>API request and response logs for your tenant</p>
        </div>
      </div>

      <div className="pl-card">
        <div className="pl-card-header">
          <h2>Request Logs</h2>
          <div className="pl-card-actions">
            <button
              className="pl-btn pl-btn-ghost"
              onClick={() => fetchLogs(1)}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="pl-filters">
          <div className="pl-filter-group">
            <label>Method:</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange("method", e.target.value)}
            >
              <option value="">All</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="pl-filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>

          <button
            className="pl-btn pl-btn-ghost"
            onClick={clearFilters}
            disabled={!filters.method && !filters.status}
          >
            Clear Filters
          </button>
        </div>

        <div className="pl-table-wrapper">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Path</th>
                <th>IP</th>
                <th>Status</th>
                <th>Duration</th>
                <th>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>
                    <span className="pl-method pl-method-{log.method.toLowerCase()}">
                      {log.method}
                    </span>
                  </td>
                  <td>
                    <Link to={`/inbound/${log.id}`}>
                      {log.path}
                    </Link>
                  </td>
                  <td>{log.source_ip}</td>
                  <td>
                    <span
                      className="pl-status"
                      style={{ color: getStatusColor(log.response_status) }}
                    >
                      {log.response_status}
                    </span>
                  </td>
                  <td>{formatDuration(log.duration_ms)}</td>
                  <td className="pl-text-truncate" style={{ maxWidth: 200 }}>
                    {log.user_agent || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="pl-empty-state">
            <p>No logs found matching your filters.</p>
          </div>
        )}

        {pagination.total > pagination.per_page && (
          <div className="pl-pagination">
            <button
              className="pl-btn pl-btn-ghost"
              disabled={pagination.page === 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.per_page)}
            </span>
            <button
              className="pl-btn pl-btn-ghost"
              disabled={pagination.page * pagination.per_page >= pagination.total}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}