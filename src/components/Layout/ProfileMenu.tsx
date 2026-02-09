
import React, { useEffect, useRef, useState } from "react";
import { User as UserIcon, X, LogOut, Key, Eye } from "lucide-react";
import type { User } from "../../types";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { UserProfileViewModal } from "./UserProfileViewModal";
import { ChangeTargetRoleModal } from "./ChangeTargetRoleModal";

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
  const [showChangeTargetRoleModal, setShowChangeTargetRoleModal] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="flex items-center" ref={ref}>
      {/* Change Target Role Button - Only for clients with optedJobLinks */}
      {user.role === 'client' && optedJobLinks && (
        <button
          onClick={() => setShowChangeTargetRoleModal(true)}
          className="flex items-center gap-2 px-4 py-2 mr-4 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm text-xs font-bold uppercase tracking-wide whitespace-nowrap"
          title="Change Target Role"
        >
          <span className="hidden md:inline">Change target role</span>
        </button>
      )}

      {/* Profile Menu Container */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 hover:bg-black/5 transition-colors flex items-center justify-center"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          title="Account"
        >
          <img src="/profile.png" alt="Profile" className="h-6 w-6" />
        </button>
      {/* <button
        className="rounded-full p-2 hover:bg-gray-500 transition"
        aria-label="Settings menu"
        title="Settings"
      >
        <img src="/settings.png" alt="settings" className="h-6 w-6" />
      </button> */}

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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
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
                className="w-full inline-flex items-center justify-start gap-3 rounded-md px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
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
      </div>

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

      {/* Change Target Role Modal - Only for clients */}
      {user.role === 'client' && (
        <ChangeTargetRoleModal
          isOpen={showChangeTargetRoleModal}
          onClose={() => setShowChangeTargetRoleModal(false)}
          userEmail={user.email}
        />
      )}
    </div>
  );
};
