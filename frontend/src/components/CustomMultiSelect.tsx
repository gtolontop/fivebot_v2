'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  description?: string;
}

interface CustomMultiSelectProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  maxDisplay?: number;
}

export default function CustomMultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Select options',
  searchable = true,
  disabled = false,
  className = '',
  error = false,
  maxDisplay = 3,
}: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchable]);

  const handleToggle = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter((v) => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== optionValue));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Values / Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left bg-white border rounded-lg
          transition-all duration-200 flex items-center justify-between min-h-[42px]
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}
          ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-primary-400 cursor-pointer'}
        `}
      >
        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 py-0.5">{placeholder}</span>
          ) : (
            <>
              {selectedOptions.slice(0, maxDisplay).map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-md text-sm font-medium"
                >
                  {option.icon && <span className="text-sm">{option.icon}</span>}
                  {option.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="max-w-[120px] truncate">{option.label}</span>
                  <button
                    onClick={(e) => handleRemove(option.value, e)}
                    className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {selectedOptions.length > maxDisplay && (
                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
                  +{selectedOptions.length - maxDisplay} more
                </span>
              )}
            </>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-64 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No options found
              </div>
            ) : (
              <>
                {/* Select All / Clear All */}
                <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">
                    {values.length} of {options.length} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onChange(options.filter(o => !o.disabled).map(o => o.value))}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => onChange([])}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all duration-150
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                      ${values.includes(option.value) ? 'bg-primary-50' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={values.includes(option.value)}
                      onChange={() => !option.disabled && handleToggle(option.value)}
                      disabled={option.disabled}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    {option.icon && (
                      <span className="text-lg flex-shrink-0">{option.icon}</span>
                    )}
                    {option.color && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{option.label}</div>
                      {option.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
