"use client";

/**
 * Registration Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
    const router = useRouter();
    const { register, isLoading: authLoading, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push('/accounts');
        }
    }, [authLoading, isAuthenticated, router]);

    // Show loading state while auth context initializes
    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-64 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-stone-600 via-stone-400 to-stone-600 rounded-full animate-loading-bar"
                            style={{ width: '40%' }}
                        />
                    </div>
                    <div className="text-stone-500 text-sm">Loading...</div>
                </div>
                <style jsx>{`
                    @keyframes loading-bar {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(150%); }
                        100% { transform: translateX(-100%); }
                    }
                    .animate-loading-bar {
                        animation: loading-bar 1.5s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    // Updates state on every keystroke
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Before sending data to the server, the frontend performs validation to catch obvious errors early.
    const validateForm = (): string | null => {
        if (formData.password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (formData.password !== formData.confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        try {
            // Frontend sends an HTTP POST request to the backend.
            await register({
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                password: formData.password,
            });

            // Auto-login successful, redirect to accounts
            router.push('/accounts');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <Card className="w-full max-w-md bg-stone-900 border-stone-800">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-white text-center">
                        Create Your Account
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
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-stone-300 mb-2">
                                    First Name
                                </label>
                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                    placeholder="John"
                                />
                            </div>

                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-stone-300 mb-2">
                                    Last Name
                                </label>
                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-stone-600"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-stone-500 mt-1">Minimum 8 characters</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
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
                            {isLoading ? 'Creating account...' : 'Register'}
                        </Button>

                        <div className="text-center text-sm text-stone-400">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-stone-300 hover:text-white underline">
                                Login here
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
