
import React, { useEffect, useRef, useState } from "react";
import { User as UserIcon, X, LogOut } from "lucide-react";
import type { User } from "../../types";

type Props = { user: User; onLogout: () => void };

function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);
  return ref;
}

export const ProfileMenu: React.FC<Props> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      {/* Person icon (always visible) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 bg-blue-700 hover:bg-gray-500 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title="Account"
      >
        <UserIcon className="h-6 w-6 text-gray-100" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl z-[60] overflow-hidden"
        >
          {/* Header with X close */}
          <div className="flex items-start justify-between gap-3 px-3 py-2 border-b bg-gray-50">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-600 truncate">{user.email}</div>
            </div>
            <button
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
