import React, { useState } from "react";

export default function QuickStartExample() {
  const [showCode, setShowCode] = useState(false);

  // Simple counter demo
  const [count, setCount] = useState(0);

  const templateCode = `<!-- Your First Template: A Simple Counter -->

<!-- 1. Declare a variable to store the count -->
<Var name="counter" type="number" initial="0" />

<!-- 2. Display the current count -->
<div style="font-size: 24px; font-weight: bold;">
  Count: <ShowVar name="counter" />
</div>

<!-- 3. Add buttons to change the count -->
<Button>
  <OnClick>
    <Increment var="counter" />
  </OnClick>
  Increment
</Button>

<Button>
  <OnClick>
    <Decrement var="counter" />
  </OnClick>
  Decrement
</Button>

<Button>
  <OnClick>
    <Set var="counter" value="0" />
  </OnClick>
  Reset
</Button>`;

  return (
    <div className="space-y-6">
      <p className="text-gray-700 text-center">
        Here&apos;s a simple interactive counter built with template components.
        Try clicking the buttons, then view the code to see how it works!
      </p>

      {/* Live Demo */}
      <div className="bg-white border-3 border-black p-8 shadow-[4px_4px_0_#000]">
        <div className="text-center space-y-6">
          <div className="text-6xl font-black text-purple-600">
            {count}
          </div>

          <div className="text-gray-500 text-sm font-medium">
            Current Count
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setCount(count + 1)}
              className="px-6 py-3 bg-green-300 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:bg-green-200 transition-all font-bold"
            >
              ➕ Increment
            </button>

            <button
              onClick={() => setCount(count - 1)}
              className="px-6 py-3 bg-red-300 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:bg-red-200 transition-all font-bold"
            >
              ➖ Decrement
            </button>

            <button
              onClick={() => setCount(0)}
              className="px-6 py-3 bg-yellow-300 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:bg-yellow-200 transition-all font-bold"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Code Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowCode(!showCode)}
          className="inline-block px-6 py-2 bg-cyan-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
        >
          {showCode ? "▲ Hide Code" : "▼ Show Code"}
        </button>
      </div>

      {/* Code Block */}
      {showCode && (
        <div className="bg-gray-900 text-green-400 p-6 rounded-none border-2 border-black shadow-[4px_4px_0_#000] font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap">{templateCode}</pre>
        </div>
      )}

      {/* Explanation */}
      {showCode && (
        <div className="bg-blue-50 border-2 border-blue-300 p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>How it works:</span>
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">1.</span>
              <span><code className="bg-purple-100 px-2 py-1 rounded">{'<Var>'}</code> declares a variable called &quot;counter&quot; with an initial value of 0</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-pink-600">2.</span>
              <span><code className="bg-pink-100 px-2 py-1 rounded">{'<ShowVar>'}</code> displays the current value of the counter</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-green-600">3.</span>
              <span><code className="bg-green-100 px-2 py-1 rounded">{'<Increment>'}</code> increases the counter by 1 when the button is clicked</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-yellow-600">4.</span>
              <span><code className="bg-yellow-100 px-2 py-1 rounded">{'<Decrement>'}</code> decreases the counter by 1</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-orange-600">5.</span>
              <span><code className="bg-orange-100 px-2 py-1 rounded">{'<Set>'}</code> sets the counter back to 0</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
