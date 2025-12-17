import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const AddFermionUserModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        userId: '',
        name: '',
        email: '',
        username: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('https://ticketingtoolapplywi-git-29729d-applywizz-tech-vercels-projects.vercel.app/api/create-fermion-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(
                    `🎉 Fermion user created successfully!\n📧 Login email sent to: ${formData.email}\n🔑 Default password: Created@123`,
                    { autoClose: 5000 }
                );
                // Reset form and close modal
                setFormData({ userId: '', name: '', email: '', username: '' });
                onClose();
            } else {
                toast.error(`❌ Error: ${data.message || 'Failed to create Fermion user'}`);
            }
        } catch (error) {
            console.error('Error creating Fermion user:', error);
            toast.error('❌ Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setFormData({ userId: '', name: '', email: '', username: '' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <UserPlus className="h-5 w-5 text-purple-600" />
                        <h2 className="text-xl font-bold text-gray-900">Add Fermion User</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4">
                    <div className="space-y-4">
                        {/* User ID Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                User ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.userId}
                                onChange={(e) => handleChange('userId', e.target.value)}
                                placeholder="e.g., AWL-2406"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">ApplyWizz ID of the client</p>
                        </div>

                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., akhil nagulapally"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="e.g., akhilds991@gmail.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">Welcome email will be sent to this address</p>
                        </div>

                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                placeholder="e.g., AWL2406"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">Fermion login username</p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800">
                            <strong>Note:</strong> The default password will be <code className="bg-purple-100 px-1 rounded">Created@123</code>
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    <span>Create User</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
//verified
