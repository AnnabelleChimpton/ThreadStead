import React from 'react';
import { useResidentData } from './ResidentDataProvider';

export default function DataDebug() {
  const data = useResidentData();

  return (
    <div className="data-debug p-4 bg-gray-100 border border-gray-300 rounded">
      <h3 className="font-bold mb-2">Data Debug Component</h3>
      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}