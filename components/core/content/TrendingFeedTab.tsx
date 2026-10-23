import React, { useState } from "react";
import RingHubFeed from "./RingHubFeed";

type TimeWindow = "hour" | "day" | "week";

export default function TrendingFeedTab() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("day");

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-300">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time Window:</label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
              className="border border-black bg-white px-3 py-1 text-sm focus:outline-none focus:shadow-[2px_2px_0_#000]"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last Day</option>
              <option value="week">Last Week</option>
            </select>
          </div>

        </div>
      </div>

      {/* Feed */}
      <RingHubFeed type="trending" timeWindow={timeWindow} />
    </div>
  );
}