import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    maxVisibleOptions?: number;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    className = '',
    maxVisibleOptions = 4
}) => {
    const [isOpen, setIsOpen] = useState(false);
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

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    const displayValue = value || placeholder;
    const optionHeight = 40; // Height of each option in pixels
    const maxHeight = optionHeight * maxVisibleOptions;

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Select Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full p-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${!value ? 'text-gray-400' : 'text-gray-900'
                    }`}
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
                    style={{ maxHeight: `${maxHeight}px` }}
                >
                    <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
                        {options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${value === option
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-900'
                                    }`}
                                style={{ height: `${optionHeight}px` }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
