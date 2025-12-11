// app/page.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-context';
export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) {
      router.push(isAuthenticated ? '/accounts' : '/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-stone-400">Loading...</div>
    </div>
  );
}