// app/page.tsx
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-context';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Redirect authenticated users to accounts
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/accounts');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-stone-600 via-stone-400 to-stone-600 rounded-full"
              style={{
                width: '40%',
                animation: 'loading-bar 1.5s ease-in-out infinite',
              }}
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            ProfEmail
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-stone-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg font-medium transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className={`max-w-6xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered
            <span className="block bg-gradient-to-r from-stone-300 via-stone-100 to-stone-400 bg-clip-text text-transparent">
              Email Coaching
            </span>
          </h1>
          <p className="text-xl text-stone-400 max-w-2xl mx-auto mb-10">
            Let AI analyze your emails, classify their priority, and generate professional draft responses in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-white text-black rounded-xl font-semibold text-lg hover:bg-stone-200 transition-all hover:scale-105 shadow-lg shadow-white/10"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-stone-800 text-white rounded-xl font-semibold text-lg hover:bg-stone-700 transition-all border border-stone-700"
            >
              Try Demo
            </Link>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
            <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl border border-stone-700 p-4 shadow-2xl">
              <img
                src="/draft.png"
                alt="ProfEmail Dashboard"
                className="w-full rounded-xl border border-stone-800"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-stone-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Powerful Features
          </h2>
          <p className="text-stone-400 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to manage your inbox efficiently with AI assistance
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-stone-900/50 rounded-2xl border border-stone-800 hover:border-stone-600 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Smart Classification
              </h3>
              <p className="text-stone-400">
                Automatically categorize emails as <span className="text-green-400">Respond</span>, <span className="text-amber-400">Notify</span>, or <span className="text-red-400">Ignore</span> based on content and context.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-stone-900/50 rounded-2xl border border-stone-800 hover:border-stone-600 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">✍️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI Draft Generation
              </h3>
              <p className="text-stone-400">
                Get professional response drafts generated in real-time with streaming support. Edit and send in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-stone-900/50 rounded-2xl border border-stone-800 hover:border-stone-600 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">🔗</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Multi-Account Support
              </h3>
              <p className="text-stone-400">
                Connect and manage multiple Outlook accounts from one unified dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-stone-400 text-center mb-16 max-w-2xl mx-auto">
            Get started in three simple steps
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-stone-300 border border-stone-700">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Connect Your Email
              </h3>
              <p className="text-stone-400">
                Securely link your Outlook account with OAuth authentication.
              </p>
              <div className="mt-6 bg-stone-900 rounded-xl border border-stone-800 p-2">
                <img src="/connect.png" alt="Connect Email" className="w-full rounded-lg" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-stone-300 border border-stone-700">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI Analyzes Emails
              </h3>
              <p className="text-stone-400">
                Our AI reads and classifies your emails, identifying which need your attention.
              </p>
              <div className="mt-6 bg-stone-900 rounded-xl border border-stone-800 p-2">
                <img src="/analyse.png" alt="AI Analysis" className="w-full rounded-lg" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-stone-300 border border-stone-700">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Get Smart Drafts
              </h3>
              <p className="text-stone-400">
                Receive AI-generated response drafts that you can edit and send instantly.
              </p>
              <div className="mt-6 bg-stone-900 rounded-xl border border-stone-800 p-2">
                <img src="/draft.png" alt="AI Draft" className="w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-stone-950 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Built with Modern Technology
          </h2>
          <p className="text-stone-400 mb-12">
            Powered by cutting-edge AI and robust infrastructure
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {['LangChain', 'OpenAI', 'Next.js', 'FastAPI', 'PostgreSQL', 'TypeScript'].map((tech) => (
              <div
                key={tech}
                className="px-6 py-3 bg-stone-900 rounded-full border border-stone-800 text-stone-300 font-medium hover:border-stone-600 transition-colors"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Inbox?
          </h2>
          <p className="text-xl text-stone-400 mb-10">
            Join ProfEmail today and let AI handle your email triage.
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-10 py-5 bg-white text-black rounded-xl font-semibold text-lg hover:bg-stone-200 transition-all hover:scale-105 shadow-lg shadow-white/10"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-stone-500 text-sm">
            © 2026 ProfEmail. AI-powered email coaching.
          </p>
          <div className="flex gap-6">
            <Link href="/auth/login" className="text-stone-500 hover:text-stone-300 text-sm transition-colors">
              Login
            </Link>
            <Link href="/auth/register" className="text-stone-500 hover:text-stone-300 text-sm transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}