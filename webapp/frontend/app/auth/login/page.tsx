"use client";

/**
 * Login Page
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login({ email, password });

            // Redirect to return URL or default to /accounts
            // router.push(`/auth/login?returnUrl=${returnUrl}`); <- done in protected-route.tsx 
            // (To check if used is logged in to see that route, if yes, the user is returned to that route)
            const returnUrl = searchParams.get('returnUrl') || '/accounts';
            router.push(returnUrl);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <Card className="w-full max-w-md bg-stone-900 border-stone-800">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-white text-center">
                        Login to AI Email Coach
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-stone-300 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-stone-700 hover:bg-stone-600 text-white py-2 rounded font-medium transition-colors"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Button>

                        <div className="text-center text-sm text-stone-400">
                            Don't have an account?{' '}
                            <Link href="/auth/register" className="text-stone-300 hover:text-white underline">
                                Register here
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-stone-400">Loading...</div>
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
