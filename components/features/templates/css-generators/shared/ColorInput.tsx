import React from 'react';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export default function ColorInput({ label, value, onChange, className = '' }: ColorInputProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-xs font-medium text-gray-700 min-w-[70px] text-xs">
        {label}
      </label>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border-2 border-gray-300 hover:border-gray-400"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-1.5 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
