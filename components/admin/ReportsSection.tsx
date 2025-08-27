import React, { useState, useEffect } from "react";

interface Report {
  id: string;
  reportType: string;
  reason: string;
  customReason?: string;
  description?: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  resolution?: string;
  reporter: {
    id: string;
    primaryHandle: string;
  };
  reportedUser?: {
    id: string;
    primaryHandle: string;
  };
  reviewer?: {
    id: string;
    primaryHandle: string;
  };
  targetContent: any;
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "pending",
    type: "all",
    page: 1
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    loadReports();
  }, [filters]);

  async function loadReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status,
        type: filters.type,
        page: filters.page.toString(),
        limit: "20"
      });

      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data: ReportsResponse = await res.json();
        setReports(data.reports);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, status: string, resolution?: string) {
    setUpdating(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status, resolution })
      });

      if (res.ok) {
        await loadReports(); // Refresh the list
      } else {
        alert("Failed to update report");
      }
    } catch (error) {
      console.error("Failed to update report:", error);
      alert("Failed to update report");
    } finally {
      setUpdating(null);
    }
  }

  async function deleteReportedContent(report: Report) {
    const contentType = report.reportType;
    const targetId = report.targetContent?.id;
    
    if (!targetId) {
      alert("Content ID not available");
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete this ${contentType}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setUpdating(report.id);
    try {
      let deleteEndpoint = "";
      let deletePayload: any = {};

      switch (contentType) {
        case "post":
          deleteEndpoint = "/api/admin/delete-post";
          deletePayload = { postId: targetId };
          break;
        case "comment":
          deleteEndpoint = "/api/admin/delete-comment";
          deletePayload = { commentId: targetId };
          break;
        case "guestbook_entry":
          deleteEndpoint = "/api/admin/delete-guestbook";
          deletePayload = { entryId: targetId };
          break;
        default:
          alert(`Deleting ${contentType} is not supported yet`);
          return;
      }

      const res = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deletePayload)
      });

      if (res.ok) {
        // Automatically resolve the report since we deleted the content
        await updateReportStatus(report.id, "resolved", `Content deleted by admin`);
        alert(`${contentType} deleted successfully`);
      } else {
        const error = await res.json();
        alert(error.error || `Failed to delete ${contentType}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${contentType}:`, error);
      alert(`Failed to delete ${contentType}`);
    } finally {
      setUpdating(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "dismissed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatReason = (reason: string, customReason?: string) => {
    const reasonMap: Record<string, string> = {
      spam: "Spam",
      harassment: "Harassment",
      hate_speech: "Hate Speech",
      violence: "Violence",
      misinformation: "Misinformation",
      sexual_content: "Sexual Content",
      copyright: "Copyright",
      other: customReason || "Other"
    };
    return reasonMap[reason] || reason;
  };

  const formatReportType = (type: string) => {
    const typeMap: Record<string, string> = {
      user: "User Account",
      post: "Post",
      comment: "Comment",
      threadring: "ThreadRing",
      guestbook_entry: "Guestbook Entry",
      photo_comment: "Photo Comment"
    };
    return typeMap[type] || type;
  };

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        🚨 Content Reports
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Review and manage user reports for inappropriate content, harassment, and policy violations.
      </p>

      {/* Filters */}
      <div className="flex gap-4 mb-4 p-3 bg-white border border-gray-200 rounded">
        <div>
          <label className="block text-sm font-medium mb-1">Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="border border-black p-1 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="border border-black p-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="user">Users</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="threadring">ThreadRings</option>
            <option value="guestbook_entry">Guestbook</option>
            <option value="photo_comment">Photo Comments</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={loadReports}
            disabled={loading}
            className="border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading && reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No reports found</div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-300 rounded p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">
                      {formatReportType(report.reportType)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-sm mb-2">
                    <strong>Reason:</strong> {formatReason(report.reason, report.customReason)}
                  </div>
                  
                  {report.description && (
                    <div className="text-sm mb-2">
                      <strong>Description:</strong> {report.description}
                    </div>
                  )}

                  <div className="text-sm mb-2">
                    <strong>Reporter:</strong> {report.reporter.primaryHandle}
                    {report.reportedUser && (
                      <span> | <strong>Reported User:</strong> {report.reportedUser.primaryHandle}</span>
                    )}
                  </div>

                  {report.targetContent && (
                    <div className="text-sm mb-2 bg-gray-50 p-2 rounded">
                      <strong>Content:</strong> 
                      {report.targetContent.deleted ? (
                        <span className="text-red-600"> [Content Deleted]</span>
                      ) : (
                        <span className="ml-2">
                          {report.targetContent.title || 
                           report.targetContent.name || 
                           report.targetContent.handle ||
                           report.targetContent.preview ||
                           "Content preview unavailable"}
                        </span>
                      )}
                    </div>
                  )}

                  {report.resolution && (
                    <div className="text-sm mt-2 bg-blue-50 p-2 rounded">
                      <strong>Resolution:</strong> {report.resolution}
                      {report.reviewer && (
                        <div className="text-xs text-gray-600 mt-1">
                          Reviewed by {report.reviewer.primaryHandle} on {new Date(report.reviewedAt!).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {report.status === "pending" && (
                  <div className="flex flex-col gap-1 ml-4">
                    <button
                      onClick={() => {
                        const resolution = prompt("Resolution notes (optional):");
                        updateReportStatus(report.id, "resolved", resolution || undefined);
                      }}
                      disabled={updating === report.id}
                      className="border border-black px-2 py-1 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-xs"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => {
                        const resolution = prompt("Dismissal reason (optional):");
                        updateReportStatus(report.id, "dismissed", resolution || undefined);
                      }}
                      disabled={updating === report.id}
                      className="border border-black px-2 py-1 bg-gray-200 hover:bg-gray-100 shadow-[1px_1px_0_#000] text-xs"
                    >
                      Dismiss
                    </button>
                    {/* Delete content button - only show for posts, comments, and guestbook entries */}
                    {(report.reportType === "post" || report.reportType === "comment" || report.reportType === "guestbook_entry") && 
                     report.targetContent && !report.targetContent.deleted && (
                      <button
                        onClick={() => deleteReportedContent(report)}
                        disabled={updating === report.id}
                        className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs"
                        title={`Delete this ${report.reportType} permanently`}
                      >
                        🗑️ Delete Content
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={filters.page === 1}
            className="border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
            disabled={filters.page === pagination.pages}
            className="border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}