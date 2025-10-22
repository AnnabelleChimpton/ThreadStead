"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface ExternalUserPopupProps {
  displayName: string;
  actorDid: string;
  role: string;
  joinedAt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExternalUserPopup({
  displayName,
  actorDid,
  role,
  joinedAt,
  isOpen,
  onClose,
}: ExternalUserPopupProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Format DID for display - show last part or handle format if parseable
  const formatDID = (did: string): string => {
    const parts = did.split(":");
    const lastPart = parts.pop() || did;
    // Show shortened version if it's a long hash
    if (lastPart.length > 20) {
      return `${lastPart.substring(0, 8)}...${lastPart.substring(lastPart.length - 6)}`;
    }
    return lastPart;
  };

  // Try to extract instance/host from DID
  const getInstanceFromDID = (did: string): string | null => {
    // Example: did:web:example.com:user:alice -> example.com
    if (did.startsWith("did:web:")) {
      const parts = did.split(":");
      if (parts.length >= 3) {
        return parts[2]; // The domain part
      }
    }
    return null;
  };

  const instance = getInstanceFromDID(actorDid);
  const formattedDID = formatDID(actorDid);
  const formattedDate = new Date(joinedAt).toLocaleDateString();

  // Role display mapping
  const getRoleDisplay = (memberRole: string) => {
    switch (memberRole) {
      case "curator":
        return { label: "Ring Host", color: "bg-yellow-200" };
      case "moderator":
        return { label: "Moderator", color: "bg-blue-200" };
      default:
        return { label: "Member", color: "bg-gray-200" };
    }
  };

  const roleInfo = getRoleDisplay(role);

  return createPortal(
    <>
      {/* Invisible backdrop for click-outside-to-close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 60000 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-thread-paper border-2 border-thread-sage rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 60001 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-thread-charcoal hover:bg-thread-cream rounded-full transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="p-6">
          {/* External User Badge */}
          <div className="mb-4 text-center">
            <span className="inline-block px-3 py-1 bg-orange-100 border border-orange-300 text-orange-800 text-xs rounded-full font-medium">
              External User
            </span>
          </div>

          {/* User Info */}
          <div className="text-center mb-6">
            {/* Avatar Placeholder */}
            <div className="w-20 h-20 rounded-full bg-thread-cream border-2 border-thread-sage mx-auto mb-3 flex items-center justify-center">
              <span className="text-3xl font-bold text-thread-charcoal">
                {displayName[0]?.toUpperCase() || "?"}
              </span>
            </div>

            {/* Display Name */}
            <h2 className="text-xl font-bold text-thread-charcoal mb-1">
              {displayName}
            </h2>

            {/* Instance Info */}
            {instance && (
              <p className="text-sm text-thread-charcoal opacity-70 mb-2">
                from {instance}
              </p>
            )}

            {/* DID */}
            <p className="text-xs text-thread-charcoal opacity-50 font-mono">
              {formattedDID}
            </p>
          </div>

          {/* Role Badge */}
          <div className="mb-6 flex justify-center">
            <span
              className={`inline-block px-4 py-2 ${roleInfo.color} border border-black text-sm font-medium rounded shadow-sm`}
            >
              {roleInfo.label}
            </span>
          </div>

          {/* Info Section */}
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-thread-pine mb-3">
              Member Information
            </h3>
            <div className="space-y-2 text-sm text-thread-charcoal">
              <div className="flex justify-between">
                <span className="opacity-70">Joined:</span>
                <span className="font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Type:</span>
                <span className="font-medium">External Member</span>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="text-xs text-thread-charcoal opacity-70 text-center p-3 bg-blue-50 border border-blue-200 rounded">
            This user is from another site in the federated network. Limited
            profile information is available.
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
