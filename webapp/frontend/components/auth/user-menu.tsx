"use client";

/**
 * User Menu - Dropdown with user info and logout
 */

import { useAuth } from './auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function UserMenu() {
    const { user, logout } = useAuth();
    const router = useRouter();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded transition-colors">
                <div className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center text-white font-medium">
                    {user.first_name[0]}{user.last_name[0]}
                </div>
                <span className="text-white text-sm">
                    {user.first_name} {user.last_name}
                </span>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-56 bg-stone-800 border border-stone-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-4 py-3 border-b border-stone-700">
                    <p className="text-sm text-white font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-stone-400">{user.email}</p>
                </div>

                <div className="py-2">
                    <Link
                        href="/accounts"
                        className="block px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
                    >
                        Email Accounts
                    </Link>
                    <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
                    >
                        Profile Settings
                    </Link>
                    <Link
                        href="/emails"
                        className="block px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
                    >
                        Inbox
                    </Link>
                </div>

                <div className="border-t border-stone-700 py-2">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-stone-700 hover:text-red-300 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
