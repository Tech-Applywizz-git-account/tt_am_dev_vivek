import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface CustomMultiSelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    maxVisibleOptions?: number;
    searchable?: boolean;
}

export const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select options',
    disabled = false,
    className = '',
    maxVisibleOptions = 4,
    searchable = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter(v => v !== option));
        } else {
            onChange([...value, option]);
        }
    };

    const handleRemoveOption = (option: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== option));
    };

    const filteredOptions = searchable && searchTerm
        ? options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    const displayValue = value.length > 0 ? value.join(', ') : placeholder;
    const optionHeight = 40;
    const maxHeight = optionHeight * maxVisibleOptions;

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Select Button */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full p-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-400'
                    } ${!value.length ? 'text-gray-400' : 'text-gray-900'}`}
            >
                <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[24px]">
                    {value.length > 0 ? (
                        value.map((item, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm"
                            >
                                {item}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveOption(item, e)}
                                        className="hover:text-blue-900"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''
                        }`}
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
                    style={{ maxHeight: `${maxHeight + (searchable ? 50 : 0)}px` }}
                >
                    {searchable && (
                        <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleToggleOption(option)}
                                    className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-2 ${value.includes(option)
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-900'
                                        }`}
                                    style={{ height: `${optionHeight}px` }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={value.includes(option)}
                                        onChange={() => { }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span>{option}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
