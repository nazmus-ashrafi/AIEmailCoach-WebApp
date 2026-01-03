"use client";

/**
 * User Profile Page - Edit profile, change password, delete account
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserMenu } from '@/components/auth/user-menu';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/utils/auth-client';

function ProfilePageContent() {
    const { user, refreshUser, logout } = useAuth();
    const router = useRouter();

    // Profile edit state
    const [profileData, setProfileData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
    });
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Password change state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Delete account state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        setIsUpdatingProfile(true);

        try {
            await authClient.updateProfile(profileData);
            await refreshUser();
            setProfileSuccess('Profile updated successfully!');
        } catch (err: any) {
            setProfileError(err.message || 'Failed to update profile');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordData.new_password !== passwordData.new_password_confirm) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordData.new_password.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        setIsChangingPassword(true);

        try {
            await authClient.changePassword(passwordData);
            setPasswordSuccess('Password changed successfully!');
            setPasswordData({
                current_password: '',
                new_password: '',
                new_password_confirm: '',
            });
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);

        try {
            await authClient.deleteAccount();
            logout();
            router.push('/auth/login');
        } catch (err: any) {
            alert(err.message || 'Failed to delete account');
            setIsDeletingAccount(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black">
            {/* Navigation Bar */}
            <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
                        <img src="/logo.png" alt="ProfEmail Logo" className="w-8 h-8" />
                        ProfEmail
                    </a>
                    <UserMenu />
                </div>
            </nav>

            {/* Main Content */}
            <div className="p-6 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-white">Profile Settings</h2>

                {/* Profile Information */}
                <Card className="bg-stone-900 border-stone-800 mb-6">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            {profileError && (
                                <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
                                    {profileError}
                                </div>
                            )}
                            {profileSuccess && (
                                <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded">
                                    {profileSuccess}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.first_name}
                                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.last_name}
                                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isUpdatingProfile}
                                className="bg-stone-700 hover:bg-stone-600 text-white"
                            >
                                {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="bg-stone-900 border-stone-800 mb-6">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Change Password</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            {passwordError && (
                                <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
                                    {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded">
                                    {passwordSuccess}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                />
                                <p className="text-xs text-stone-500 mt-1">Minimum 8 characters</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.new_password_confirm}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isChangingPassword}
                                className="bg-stone-700 hover:bg-stone-600 text-white"
                            >
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Delete Account */}
                <Card className="bg-stone-900 border-red-900/30">
                    <CardHeader>
                        <CardTitle className="text-xl text-red-400">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-stone-400 mb-4">
                            Once you delete your account, there is no going back. All your data will be permanently deleted.
                        </p>

                        {!showDeleteConfirm ? (
                            <Button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800"
                            >
                                Delete Account
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
                                    <p className="font-medium">Are you absolutely sure?</p>
                                    <p className="text-sm mt-1">This action cannot be undone.</p>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeletingAccount}
                                        className="bg-red-900 hover:bg-red-800 text-white"
                                    >
                                        {isDeletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
                                    </Button>
                                    <Button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="bg-stone-700 hover:bg-stone-600 text-white"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfilePageContent />
        </ProtectedRoute>
    );
}
