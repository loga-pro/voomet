import React, { useState, useRef, useEffect } from 'react';

const ComboBox = ({
    label,
    value,
    onChange,
    error,
    name,
    required = false,
    options = [],
    disabled = false,
    size = 'medium'
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const hasValue = inputValue && inputValue.toString().length > 0;
    const isActive = isFocused || hasValue;

    // Size configuration
    const sizeConfig = {
        small: {
            container: 'mb-2',
            input: 'px-2 pt-3 pb-0.5 text-xs',
            label: 'left-2 text-xs',
            labelActive: 'top-0 text-[10px] transform -translate-y-1/2',
            labelInactive: 'top-1.5 text-xs',
            icon: 'w-3 h-3',
            dropdownIcon: 'w-2.5 h-2.5',
            errorText: 'text-[10px]',
            dropdown: 'text-xs'
        },
        medium: {
            container: 'mb-3',
            input: 'px-2.5 pt-4 pb-1.5 text-sm',
            label: 'left-2.5 text-sm',
            labelActive: 'top-0 text-xs transform -translate-y-1/2',
            labelInactive: 'top-2.5 text-sm',
            icon: 'w-4 h-4',
            dropdownIcon: 'w-3.5 h-3.5',
            errorText: 'text-xs',
            dropdown: 'text-sm'
        },
        large: {
            container: 'mb-4',
            input: 'px-3 pt-5 pb-2 text-base',
            label: 'left-3 text-base',
            labelActive: 'top-0 text-sm transform -translate-y-1/2',
            labelInactive: 'top-3 text-base',
            icon: 'w-5 h-5',
            dropdownIcon: 'w-4 h-4',
            errorText: 'text-sm',
            dropdown: 'text-base'
        }
    };

    const currentSize = sizeConfig[size] || sizeConfig.medium;

    // Update input value when prop value changes
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setShowDropdown(true);

        // Call parent onChange
        onChange({
            target: {
                name: name,
                value: newValue
            }
        });
    };

    const handleOptionClick = (option) => {
        setInputValue(option.label);
        setShowDropdown(false);

        // Call parent onChange
        onChange({
            target: {
                name: name,
                value: option.value
            }
        });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setShowDropdown(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Don't close dropdown immediately to allow option click
        setTimeout(() => {
            setShowDropdown(false);
        }, 200);
    };

    // Filter options based on input
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className={`relative ${currentSize.container}`} ref={dropdownRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    id={name}
                    name={name}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className={`block w-full ${currentSize.input} text-gray-900 
            ${disabled ? 'bg-gray-50 cursor-default' : 'bg-white'} rounded border
            ${error ? 'border-red-500' : isFocused ? 'border-blue-500' : 'border-gray-300'} 
            focus:outline-none focus:border-blue-500 transition-colors duration-200
            pr-8`}
                />

                <label
                    htmlFor={name}
                    className={`absolute ${currentSize.label} transition-all duration-200 pointer-events-none bg-white px-1
            ${isActive
                            ? `${currentSize.labelActive} text-blue-600 font-medium`
                            : `${currentSize.labelInactive} text-gray-500`
                        }`}
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>

                {/* Dropdown arrow */}
                {!disabled && (
                    <div
                        className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
                        onClick={() => {
                            inputRef.current?.focus();
                            setShowDropdown(!showDropdown);
                        }}
                    >
                        <svg
                            className={`${currentSize.dropdownIcon} text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                )}

                {/* Dropdown options */}
                {showDropdown && !disabled && filteredOptions.length > 0 && (
                    <div className={`absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto ${currentSize.dropdown}`}>
                        {filteredOptions.map((option, index) => (
                            <div
                                key={`option-${index}-${option.value}`}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors duration-150"
                                onClick={() => handleOptionClick(option)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="mt-0.5 flex items-start">
                    <svg className={`${currentSize.icon} mt-0.5 mr-1 text-red-500 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 
                1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 
                0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <p className={`${currentSize.errorText} text-red-600`}>{error}</p>
                </div>
            )}
        </div>
    );
};

export default ComboBox;
