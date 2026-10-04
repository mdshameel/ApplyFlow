import React from 'react';
import { MONTH_NAMES } from '../lib/formatters';

interface DateInputProps {
  day: string;
  month: string;
  year: string;
  onChange: (parts: { day: string; month: string; year: string }) => void;
  error?: string | null;
  disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  day,
  month,
  year,
  onChange,
  error,
  disabled = false
}) => {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-3">
        {/* Day */}
        <div>
          <label className="block text-xs font-medium text-[#6B665E] mb-1">Day</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="12"
            maxLength={2}
            value={day}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              onChange({ day: val, month, year });
            }}
            className={`w-full h-11 px-3 bg-white border ${
              error ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
            } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C] disabled:bg-[#F5F3EF] disabled:cursor-not-allowed`}
          />
        </div>

        {/* Month Dropdown */}
        <div>
          <label className="block text-xs font-medium text-[#6B665E] mb-1">Month</label>
          <select
            value={month}
            disabled={disabled}
            onChange={(e) => onChange({ day, month: e.target.value, year })}
            className={`w-full h-11 px-3 bg-white border ${
              error ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
            } rounded-[6px] text-base text-[#1F1D1A] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C] disabled:bg-[#F5F3EF] disabled:cursor-not-allowed`}
          >
            <option value="">Month</option>
            {MONTH_NAMES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-xs font-medium text-[#6B665E] mb-1">Year</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="2003"
            maxLength={4}
            value={year}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              onChange({ day, month, year: val });
            }}
            className={`w-full h-11 px-3 bg-white border ${
              error ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
            } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C] disabled:bg-[#F5F3EF] disabled:cursor-not-allowed`}
          />
        </div>
      </div>
      {error && <p className="text-sm text-[#B3362E]">{error}</p>}
    </div>
  );
};
