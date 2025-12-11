"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

interface ConversationSearchBarProps {
    onSearchChange: (searchTerm: string) => void;
    placeholder?: string;
    className?: string;
}

export default function ConversationSearchBar({
    onSearchChange,
    placeholder = "Search Inbox...",
    className = "",
}: ConversationSearchBarProps) {
    const [inputValue, setInputValue] = useState("");

    // Debounce the search term
    // Following the YAGNI (You Aren't Gonna Need It) principle + Rule of Three (extract on the third use, not the first), and keeping the debounce login here
    // May make it a custom hook in the future, if debounce is needed in other places
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearchChange(inputValue);
        }, 300);

        return () => clearTimeout(timer); // if value changes before 300ms, clear the timer

    }, [inputValue, onSearchChange]);

    const handleClear = () => {
        setInputValue("");
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {inputValue && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
