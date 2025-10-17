import React from 'react';

interface UnitInputProps {
  label: string;
  value: number;
  unit: string;
  units: string[];
  onValueChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export default function UnitInput({
  label,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
  min = 0,
  max = 1000,
  step = 1,
  className = ''
}: UnitInputProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-xs font-medium text-gray-700 min-w-[70px] text-xs">
        {label}
      </label>
      <div className="flex items-center gap-0 flex-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="px-1.5 py-1 text-xs border border-l-0 border-gray-300 rounded-r bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
