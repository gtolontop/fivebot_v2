'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BoltIcon, CheckIcon, ShieldCheckIcon, ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleDiscordLogin = () => {
    console.log('Redirecting to Discord auth...');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/auth/discord`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-discord-200 border-t-discord-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-discord-300 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-discord-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-discord-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center px-8">
          <Link href="/" className="inline-flex items-center space-x-3 mb-12 group">
            <div className="w-12 h-12 bg-gradient-to-br from-discord-500 to-discord-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <BoltIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">FiveBot</span>
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Manage Your Discord Bots
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-discord-500 to-discord-600">
              Like a Pro
            </span>
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Deploy, monitor, and scale Discord bots with zero configuration. Join thousands of developers already using FiveBot.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-sm text-gray-600">Deploy bots in under 10 seconds</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure by Default</h3>
                <p className="text-sm text-gray-600">AES-256 encryption & isolated containers</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Analytics</h3>
                <p className="text-sm text-gray-600">Monitor performance & user engagement</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <CpuChipIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Auto-Scaling</h3>
                <p className="text-sm text-gray-600">Handles traffic spikes automatically</p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Trusted by developers at</p>
            <div className="flex items-center space-x-6 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Discord</div>
              <div className="text-2xl font-bold text-gray-400">GitHub</div>
              <div className="text-2xl font-bold text-gray-400">OpenAI</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <Link href="/" className="lg:hidden flex items-center justify-center space-x-3 mb-8 group">
              <div className="w-12 h-12 bg-gradient-to-br from-discord-500 to-discord-600 rounded-xl flex items-center justify-center shadow-lg">
                <BoltIcon className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">FiveBot</span>
            </Link>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-600">
                  Sign in to access your dashboard
                </p>
              </div>

              <button
                onClick={handleDiscordLogin}
                className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#5865F2]/50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.942 5.556a16.3 16.3 0 0 0-4.126-1.3 12.04 12.04 0 0 0-.529 1.1 15.175 15.175 0 0 0-4.573 0 11.585 11.585 0 0 0-.535-1.1 16.274 16.274 0 0 0-4.129 1.3A17.392 17.392 0 0 0 .182 13.218a15.785 15.785 0 0 0 4.963 2.521c.41-.564.773-1.16 1.084-1.785a10.63 10.63 0 0 1-1.706-.83c.143-.106.283-.217.418-.33a11.664 11.664 0 0 0 10.118 0c.137.113.277.224.418.33-.544.328-1.116.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595 17.286 17.286 0 0 0-2.973-7.589zM6.678 10.813a1.941 1.941 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.919 1.919 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045zm6.644 0a1.94 1.94 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.918 1.918 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045z"/>
                </svg>
                Continue with Discord
              </button>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-center text-gray-500 leading-relaxed">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-discord-600 hover:text-discord-700 underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-discord-600 hover:text-discord-700 underline">Privacy Policy</a>
                </p>
              </div>

              {/* Mobile Features */}
              <div className="lg:hidden mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Deploy in under 10 seconds</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>99.9% uptime guarantee</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button onClick={handleDiscordLogin} className="text-discord-600 hover:text-discord-700 font-semibold">
                Sign up for free
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}