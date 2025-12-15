import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountContextType {
    selectedAccountId: string | null;
    setSelectedAccountId: (id: string | null, shouldPersist?: boolean) => void;
    clearSelection: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface AccountProviderProps {
    children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
    const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
        // Initialize from localStorage
        const saved = localStorage.getItem('selectedAccountId');
        return saved || null;
    });

    // Sync with localStorage whenever it changes (only if shouldPersist is true)
    const setSelectedAccountId = (id: string | null, shouldPersist: boolean = true) => {
        setSelectedAccountIdState(id);

        // Only use localStorage if shouldPersist is true (i.e., multiple accounts exist)
        if (shouldPersist) {
            if (id) {
                localStorage.setItem('selectedAccountId', id);
            } else {
                localStorage.removeItem('selectedAccountId');
            }
        }
    };

    // Clear selection and remove from localStorage
    const clearSelection = () => {
        setSelectedAccountIdState(null);
        localStorage.removeItem('selectedAccountId');
    };

    // Listen for changes from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'selectedAccountId') {
                setSelectedAccountIdState(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <AccountContext.Provider value={{ selectedAccountId, setSelectedAccountId, clearSelection }}>
            {children}
        </AccountContext.Provider>
    );
};

export const useAccount = () => {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccount must be used within an AccountProvider');
    }
    return context;
};
