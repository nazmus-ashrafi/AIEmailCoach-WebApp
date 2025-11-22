"use client";

/**
 * Protected Route HOC - Redirects to login if not authenticated
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth-context';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store intended destination for post-login redirect
            const returnUrl = encodeURIComponent(pathname);
            router.push(`/auth/login?returnUrl=${returnUrl}`);
        }
    }, [isAuthenticated, isLoading, router, pathname]);

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-stone-400">Loading...</div>
            </div>
        );
    }

    // Show nothing while redirecting
    if (!isAuthenticated) {
        return null;
    }

    // Render protected content
    return <>{children}</>;
}
