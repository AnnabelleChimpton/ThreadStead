import React from "react";
import { Website } from "./WebsiteManager";

interface WebsiteDisplayProps {
  websites: Website[];
}

export default function WebsiteDisplay({ websites }: WebsiteDisplayProps) {
  if (!websites || websites.length === 0) {
    return (
      <div className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
        <h4 className="font-bold mb-2">Website Recommendations</h4>
        <p className="text-gray-500 text-sm">No websites added yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
      <h4 className="font-bold mb-3">Website Recommendations</h4>
      <div className="space-y-3">
        {websites.map((website) => (
          <div key={website.id} className="border-l-4 border-blue-400 pl-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-semibold">
                  <a 
                    href={website.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {website.label}
                  </a>
                </h5>
                {website.blurb && (
                  <p className="text-sm text-gray-700 mt-1">{website.blurb}</p>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {website.url}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}