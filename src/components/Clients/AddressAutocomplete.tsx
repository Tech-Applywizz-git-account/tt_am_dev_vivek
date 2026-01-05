import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressSuggestion {
    display_name: string;
    place_id: number;
    lat: string;
    lon: string;
}

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, disabled, placeholder }: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const fetchAddressSuggestions = async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            // Using Nominatim (OpenStreetMap) API - Free and no API key required
            // Limit to USA and UK
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}` +
                `&countrycodes=us,gb` + // USA and UK only
                `&format=json` +
                `&addressdetails=1` +
                `&limit=5`,
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSuggestions(data);
                setShowSuggestions(data.length > 0);
            }
        } catch (error) {
            console.error('Error fetching address suggestions:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        // Debounce API calls
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            fetchAddressSuggestions(newValue);
        }, 500); // Wait 500ms after user stops typing
    };

    const handleSuggestionClick = (suggestion: AddressSuggestion) => {
        setInputValue(suggestion.display_name);
        onChange(suggestion.display_name);
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <div className="relative">
                <div className="absolute top-3 left-3">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : (
                        <MapPin className="h-4 w-4 text-gray-400" />
                    )}
                </div>
                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={disabled}
                    readOnly={disabled}
                    rows={3}
                    placeholder={placeholder || 'Start typing address... (USA/UK)'}
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion.place_id}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm text-gray-900">
                                        {suggestion.display_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                        Powered by OpenStreetMap
                    </div>
                </div>
            )}
        </div>
    );
}
