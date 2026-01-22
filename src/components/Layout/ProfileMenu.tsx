
import React, { useEffect, useRef, useState } from "react";
import { User as UserIcon, X, LogOut, Key, Eye } from "lucide-react";
import type { User } from "../../types";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { UserProfileViewModal } from "./UserProfileViewModal";

type Props = { user: User; onLogout: () => void | Promise<void>; optedJobLinks?: boolean };

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

export const ProfileMenu: React.FC<Props> = ({ user, onLogout, optedJobLinks }) => {
  const [open, setOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showViewProfileModal, setShowViewProfileModal] = useState(false);
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
              {user.role !== 'client' && (
                <div className="text-xs text-gray-600 truncate">{user.role}</div>
              )}
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
          <div className="p-2 space-y-2">
            {/* View Profile - Only for clients */}
            {user.role === 'client' && (optedJobLinks) && (
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                onClick={() => {
                  setOpen(false);
                  setShowViewProfileModal(true);
                }}
              >
                <Eye className="h-4 w-4" />
                View Profile
              </button>
            )}
            <button
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              onClick={() => {
                setOpen(false);
                setShowChangePasswordModal(true);
              }}
            >
              <Key className="h-4 w-4" />
              Change Password
            </button>
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        userEmail={user.email}
      />

      {/* View Profile Modal - Only for clients */}
      {user.role === 'client' && (
        <UserProfileViewModal
          isOpen={showViewProfileModal}
          onClose={() => setShowViewProfileModal(false)}
          userEmail={user.email}
        />
      )}
    </div>
  );
};