// ✅ File: src/components/Auth/DialogBox.tsx
import React, { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const DialogBox: React.FC<Props> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timeout = setTimeout(onClose, 2500);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  );
};

export default DialogBox;
