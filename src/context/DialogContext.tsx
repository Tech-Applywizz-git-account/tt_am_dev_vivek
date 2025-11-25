import React, { createContext, useContext, useState } from 'react';

interface DialogContextType {
  showDialog: (message: string) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState({
    open: false,
    message: '',
  });

  const showDialog = (message: string) => {
    setDialog({ open: true, message });
  };

  const closeDialog = () => {
    setDialog({ open: false, message: '' });
  };

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      {dialog.open && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl shadow-xl p-6 min-w-[300px] max-w-md">
            <div className="text-gray-800 mb-4">{dialog.message}</div>
            <button
              onClick={closeDialog}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};