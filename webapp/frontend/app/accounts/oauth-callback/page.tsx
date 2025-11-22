"use client";

/**
 * OAuth Callback Handler Page
 * 
 * Handles the OAuth2 callback from Microsoft after user authorization.
 * Shows success/error messages and redirects to accounts page.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [message, setMessage] = useState('Processing...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const existing = searchParams.get('existing');

        if (success) {
            if (existing) {
                setMessage('This account is already connected!');
            } else {
                setMessage('Account connected successfully!');
            }
            setIsError(false);

            // Redirect to accounts page after 2 seconds
            setTimeout(() => {
                router.push('/accounts');
            }, 2000);
        } else if (error) {
            setIsError(true);

            switch (error) {
                case 'auth_failed':
                    setMessage('Failed to initiate authorization. Please try again.');
                    break;
                case 'invalid_state':
                    setMessage('Invalid or expired authorization request. Please try again.');
                    break;
                case 'callback_failed':
                    setMessage('Failed to connect account. Please try again.');
                    break;
                case 'missing_params':
                    setMessage('Missing required parameters. Please try again.');
                    break;
                default:
                    setMessage(`Error: ${error}. Please try again.`);
            }

            // Redirect to accounts page after 4 seconds on error
            setTimeout(() => {
                router.push('/accounts');
            }, 4000);
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <Card className="bg-stone-900 border-stone-800 max-w-md w-full">
                <CardContent className="pt-6">
                    <div className="text-center">
                        {/* Loading/Success/Error Icon */}
                        <div className="mb-4">
                            {!isError ? (
                                <div className="mx-auto w-16 h-16 rounded-full bg-green-900/30 border border-green-800 flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-green-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                            ) : (
                                <div className="mx-auto w-16 h-16 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-red-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Message */}
                        <h2 className={`text-xl font-semibold mb-2 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                            {isError ? 'Connection Failed' : 'Success!'}
                        </h2>
                        <p className="text-stone-400 mb-4">{message}</p>

                        {/* Redirect Notice */}
                        <p className="text-sm text-stone-500">
                            Redirecting to accounts page...
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
