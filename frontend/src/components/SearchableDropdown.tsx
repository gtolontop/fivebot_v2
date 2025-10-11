'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
  guildName?: string;
  isRole?: boolean;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  emptyMessage = "No options available",
  searchPlaceholder
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected option
  const selectedOption = options.find(option => option.id === value);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.guildName && option.guildName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className="input-field w-full text-left flex items-center justify-between"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption 
            ? `${selectedOption.isRole ? '@' : '#'}${selectedOption.name}${selectedOption.guildName ? ` (${selectedOption.guildName})` : ''}`
            : placeholder
          }
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder={searchPlaceholder || (options.some(o => o.isRole) ? "Search roles by name or ID..." : "Search channels by name or ID...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-discord-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-gray-500 text-sm"
                >
                  None selected
                </button>
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm ${
                      option.id === value ? 'bg-discord-50 text-discord-700' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.isRole ? '@' : '#'}{option.name}</span>
                      {option.guildName && (
                        <span className="text-xs text-gray-500">
                          {option.guildName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ID: {option.id}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm text-center">
                {searchTerm
                  ? (options.some(o => o.isRole) ? 'No roles found matching your search' : 'No channels found matching your search')
                  : emptyMessage
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}