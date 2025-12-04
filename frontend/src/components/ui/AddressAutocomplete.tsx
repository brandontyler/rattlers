import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { apiService } from '@/services/api';
import type { AddressSuggestion } from '@/types';

interface AddressAutocompleteProps {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  onSelect?: (suggestion: AddressSuggestion) => void;
  initialValue?: string;
  className?: string;
  required?: boolean;
}

export interface AddressAutocompleteRef {
  getAddress: () => string;
  getSelectedSuggestion: () => AddressSuggestion | null;
  clearSelection: () => void;
}

const AddressAutocomplete = forwardRef<AddressAutocompleteRef, AddressAutocompleteProps>(
  ({ label, error, helperText, placeholder, onSelect, initialValue = '', className = '', required }, ref) => {
    const [inputValue, setInputValue] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<AddressSuggestion | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getAddress: () => inputValue,
      getSelectedSuggestion: () => selectedSuggestion,
      clearSelection: () => {
        setInputValue('');
        setSelectedSuggestion(null);
        setSuggestions([]);
      },
    }));

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Fetch suggestions with debouncing
    useEffect(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (inputValue.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceTimerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const response = await apiService.suggestAddresses({ query: inputValue });
          if (response.success && response.data) {
            setSuggestions(response.data.suggestions);
            setShowSuggestions(response.data.suggestions.length > 0);
          }
        } catch (error) {
          console.error('Error fetching address suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      }, 300);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [inputValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setSelectedSuggestion(null);
      setHighlightedIndex(-1);
    };

    const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
      setInputValue(suggestion.address);
      setSelectedSuggestion(suggestion);
      setShowSuggestions(false);
      setSuggestions([]);
      if (onSelect) {
        onSelect(suggestion);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    };

    const inputId = `address-input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`w-full relative ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-forest-700 mb-2"
          >
            {label}
            {required && <span className="text-burgundy-600 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder || 'Start typing an address...'}
            className={`input-field ${error ? 'border-burgundy-500 focus:ring-burgundy-500' : ''} ${
              selectedSuggestion ? 'bg-sage-50' : ''
            }`}
            required={required}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-forest-600"></div>
            </div>
          )}
          {selectedSuggestion && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sage-600">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-sage-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.lat}-${suggestion.lng}-${index}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-sage-50 focus:bg-sage-50 focus:outline-none border-b border-sage-100 last:border-b-0 transition-colors ${
                  index === highlightedIndex ? 'bg-sage-100' : ''
                }`}
              >
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-burgundy-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-forest-900">
                      {suggestion.displayName}
                    </div>
                    <div className="text-xs text-forest-500 mt-1">
                      {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-burgundy-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-forest-500">{helperText}</p>
        )}
        {selectedSuggestion && (
          <p className="mt-2 text-sm text-sage-600">
            Selected coordinates: {selectedSuggestion.lat.toFixed(6)}, {selectedSuggestion.lng.toFixed(6)}
          </p>
        )}
      </div>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';

export default AddressAutocomplete;
