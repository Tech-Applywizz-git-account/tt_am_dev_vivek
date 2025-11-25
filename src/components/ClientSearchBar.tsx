import React from 'react';

interface ClientSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const ClientSearchBar: React.FC<ClientSearchBarProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-white">
      <input
        type="text"
        placeholder="Search clients by name or email..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
};