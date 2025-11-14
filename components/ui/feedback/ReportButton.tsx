import React, { useState } from "react";
import { ReportType, ReportReason } from "@prisma/client";
import Modal from "@/components/ui/feedback/Modal";

interface ReportButtonProps {
  reportType: ReportType;
  targetId: string;
  reportedUserId?: string;
  contentPreview?: string;
  className?: string;
  size?: "small" | "normal" | "dropdown" | "desktop";
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Unwanted promotional content or repetitive messages" },
  { value: "harassment", label: "Harassment", description: "Targeted abuse, bullying, or intimidation" },
  { value: "hate_speech", label: "Hate Speech", description: "Content promoting hatred based on identity" },
  { value: "violence", label: "Violence", description: "Threats of violence or graphic violent content" },
  { value: "misinformation", label: "Misinformation", description: "False or misleading information" },
  { value: "sexual_content", label: "Sexual Content", description: "Inappropriate sexual or suggestive content" },
  { value: "copyright", label: "Copyright", description: "Unauthorized use of copyrighted material" },
  { value: "other", label: "Other", description: "Another reason not listed above" },
];

export default function ReportButton({ 
  reportType, 
  targetId, 
  reportedUserId, 
  contentPreview,
  className = "",
  size = "normal"
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | "">("");
  const [customReason, setCustomReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      alert("Please select a reason for reporting");
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      alert("Please specify a custom reason");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          targetId,
          reportedUserId,
          reason: selectedReason,
          customReason: selectedReason === "other" ? customReason.trim() : undefined,
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setShowModal(false);
          setSubmitted(false);
          setSelectedReason("");
          setCustomReason("");
          setDescription("");
        }, 2000);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClasses = size === "dropdown"
    ? "flex items-center gap-2 w-full text-sm text-left hover:bg-gray-100"
    : size === "desktop"
    ? ""
    : "comment-button";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`${buttonClasses} transition-colors ${className}`}
        title="Report this content"
      >
        <span>🚩</span>
        <span className="hidden md:inline">{size !== "dropdown" ? " Report" : "Report"}</span>
      </button>

      {showModal && (
        <Modal 
          isOpen={showModal}
          onClose={() => setShowModal(false)} 
          title="Report Content"
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-green-600 mb-2 text-lg">✅</div>
              <p className="font-semibold text-green-700">Report submitted successfully</p>
              <p className="text-sm text-gray-600 mt-2">
                Thank you for helping keep our community safe. Our moderators will review this report.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {contentPreview && (
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm font-medium mb-1">Reporting this content:</p>
                  <p className="text-sm text-gray-700 italic">&quot;{contentPreview}&quot;</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  What&apos;s the issue with this content?
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label key={reason.value} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm">{reason.label}</div>
                        <div className="text-xs text-gray-600">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedReason === "other" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Please specify the reason:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    placeholder="Describe the issue..."
                    maxLength={100}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Additional details (optional):
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={3}
                  placeholder="Provide any additional context that might help moderators understand the issue..."
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedReason || submitting}
                  className="border border-black px-4 py-2 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}