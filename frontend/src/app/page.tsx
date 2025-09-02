"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  ChartBarIcon,
  BoltIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PlayIcon,
  UserGroupIcon,
  CommandLineIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ClockIcon,
  ArrowPathIcon,
  FireIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { number: "99.9%", label: "Uptime", icon: ClockIcon },
  { number: "50ms", label: "Response Time", icon: BoltIcon },
  { number: "10k+", label: "Active Bots", icon: CubeIcon },
  { number: "24/7", label: "Support", icon: ChatBubbleLeftRightIcon },
];

const features = [
  {
    title: "Lightning Fast Deployment",
    description: "Deploy your bot in under 10 seconds with our automated containerization system",
    icon: RocketLaunchIcon,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Bank-Level Security",
    description: "AES-256 encryption, isolated containers, and real-time threat monitoring",
    icon: ShieldCheckIcon,
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Smart Analytics",
    description: "AI-powered insights to optimize your bot performance and user engagement",
    icon: ChartBarIcon,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Auto-Scaling Infrastructure",
    description: "Automatically scales resources based on your bot's demand",
    icon: CloudArrowUpIcon,
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Developer API",
    description: "Powerful REST API with webhooks for seamless integrations",
    icon: CodeBracketIcon,
    color: "from-indigo-500 to-purple-500",
  },
  {
    title: "Global CDN",
    description: "Distributed across 30+ regions for minimal latency worldwide",
    icon: GlobeAltIcon,
    color: "from-pink-500 to-rose-500",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "0",
    period: "forever",
    description: "Perfect for trying out FiveBot",
    features: [
      "Up to 2 bots",
      "100 commands/day",
      "Basic analytics",
      "Community support",
      "99.5% uptime SLA",
    ],
    notIncluded: [
      "Custom branding",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "19",
    period: "per month",
    description: "Everything you need to scale",
    features: [
      "Unlimited bots",
      "Unlimited commands",
      "Advanced analytics & AI insights",
      "Priority 24/7 support",
      "99.9% uptime SLA",
      "Custom webhooks",
      "API access",
      "White-label options",
    ],
    notIncluded: [
      "Dedicated infrastructure",
    ],
    cta: "Start 14-day trial",
    popular: true,
    savings: "Save 20% yearly",
  },
  {
    name: "Enterprise",
    price: "99",
    period: "per month",
    description: "For large-scale operations",
    features: [
      "Everything in Pro",
      "Dedicated infrastructure",
      "Custom integrations",
      "SLA guarantees",
      "Dedicated account manager",
      "On-premise deployment option",
      "Advanced security features",
      "Custom training for your team",
      "Phone support",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    name: "Alex Chen",
    role: "Community Manager",
    company: "Gaming Guild",
    content: "FiveBot transformed how we manage our 50k+ member Discord. The automation saves us 20+ hours per week.",
    avatar: "AC",
    rating: 5,
  },
  {
    name: "Sarah Williams",
    role: "Developer",
    company: "Tech Startup",
    content: "The API is incredibly well-designed. We integrated FiveBot into our workflow in just 2 hours.",
    avatar: "SW",
    rating: 5,
  },
  {
    name: "Mike Johnson",
    role: "Server Owner",
    company: "Crypto Community",
    content: "Best investment for our Discord. The analytics help us understand our community better.",
    avatar: "MJ",
    rating: 5,
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedPlan, setSelectedPlan] = useState("Pro");
  const [activeFeature, setActiveFeature] = useState(0);
  const [commandCount, setCommandCount] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    
    // Animate command counter
    const interval = setInterval(() => {
      setCommandCount(prev => prev + Math.floor(Math.random() * 10) + 1);
    }, 100);

    // Rotate features
    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 3000);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
      clearInterval(featureInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="discord-spinner w-16 h-16 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
          <div className="absolute inset-0 discord-spinner w-16 h-16 border-4 border-transparent border-t-discord-300 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(88, 101, 242, 0.1) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-discord-500 to-discord-600 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">FiveBot</span>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <a href="#features" className="text-sm font-medium text-gray-600 hover:text-discord-600 transition-colors">Features</a>
                <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-discord-600 transition-colors">How it works</a>
                <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-discord-600 transition-colors">Pricing</a>
                <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-discord-600 transition-colors">Testimonials</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">Welcome back, {user.username}!</span>
                  <Link href="/dashboard" className="btn-primary">
                    Open Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-discord-600">
                    Sign in
                  </Link>
                  <Link href="http://localhost:8000/api/auth/discord" className="btn-discord flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-discord-50 via-white to-blue-50"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-discord-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-discord-100 text-discord-700 text-sm font-medium mb-8 animate-fade-in-down">
            <FireIcon className="w-4 h-4 mr-2" />
            Trusted by 10,000+ Discord servers
          </div>
          <h1 className="text-6xl lg:text-8xl font-bold text-gray-900 tracking-tight animate-fade-in-up">
            The Future of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-discord-500 to-discord-600 mt-2 pb-2">
              Discord Bot Management
            </span>
          </h1>
          <p className="mt-6 text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Create, deploy, and scale Discord bots with zero configuration. 
            Powered by AI, secured by default, loved by developers.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
            <Link
              href={user ? "/dashboard" : "/auth/login"}
              className="group inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-white bg-discord-600 rounded-xl hover:bg-discord-700 transition-all transform hover:scale-105 hover:shadow-2xl"
            >
              Start Building for Free
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => setIsVideoPlaying(true)}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white transition-all hover:shadow-lg"
            >
              <PlayIcon className="mr-2 w-5 h-5" />
              Watch Live Demo
            </button>
          </div>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in-up animation-delay-600">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center group hover:transform hover:scale-110 transition-all">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-sm rounded-xl mb-3 group-hover:shadow-lg transition-all">
                  <stat.icon className="w-7 h-7 text-discord-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stat.label === "Active Bots" ? commandCount.toLocaleString() : stat.number}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Live command counter */}
          <div className="mt-16 animate-fade-in-up animation-delay-800">
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3"></div>
              <span className="text-sm font-medium text-gray-700">
                <span className="font-bold text-discord-600">{(commandCount * 127).toLocaleString()}</span> commands processed today
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Modal - Interactive Flow */}
      {isVideoPlaying && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative max-w-6xl w-full">
            {/* Clean Modal Container */}
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">FiveBot Demo</h3>
                <button 
                  onClick={() => setIsVideoPlaying(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Demo Content */}
              <div className="relative" style={{ height: '600px' }}>
                {/* Animated Background */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 w-96 h-96 bg-discord-500/10 rounded-full blur-3xl animate-float"></div>
                  <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
                </div>
                
                {/* Animated Cursor */}
                <div className="absolute z-50 pointer-events-none animate-demo-cursor">
                  <div className="relative">
                    <svg className="w-6 h-6 text-white drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 3l14 7-6 2-2 6-8-15z"/>
                    </svg>
                    <div className="absolute inset-0 w-6 h-6 bg-white/30 rounded-full animate-ping"></div>
                  </div>
                </div>
                
                {/* Page 1: Welcome */}
                <div className="absolute inset-0 flex items-center justify-center p-12 animate-page-1">
                  <div className="text-center">
                    <h1 className="text-5xl font-bold text-white mb-6">
                      Welcome to{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-discord-400 to-purple-400">
                        FiveBot
                      </span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-12">Create your Discord bot in seconds</p>
                    <button className="px-8 py-4 bg-gradient-to-r from-discord-500 to-discord-600 text-white font-semibold rounded-xl hover:from-discord-600 hover:to-discord-700 transition-all transform hover:scale-105 shadow-2xl">
                      Create Your Bot
                    </button>
                  </div>
                </div>
                
                {/* Page 2: Bot Configuration */}
                <div className="absolute inset-0 flex items-center justify-center p-12 animate-page-2">
                  <div className="w-full max-w-2xl">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">Configure Your Bot</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-gray-400 mb-2">Bot Name</label>
                        <input 
                          type="text"
                          className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-6 py-4 text-white text-lg focus:border-discord-500 transition-all animate-auto-type-name"
                          placeholder="Enter bot name..."
                          value=""
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-2">Bot Prefix</label>
                        <input 
                          type="text"
                          className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-6 py-4 text-white text-lg focus:border-discord-500 transition-all animate-auto-type-prefix"
                          placeholder="!"
                          value=""
                          readOnly
                        />
                      </div>
                      <button className="w-full px-8 py-4 bg-gradient-to-r from-discord-500 to-discord-600 text-white font-semibold rounded-xl hover:from-discord-600 hover:to-discord-700 transition-all transform hover:scale-105">
                        Create Bot
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Page 3: Dashboard */}
                <div className="absolute inset-0 p-12 animate-page-3">
                  <div className="h-full">
                    <h2 className="text-2xl font-bold text-white mb-6">Bot Dashboard</h2>
                    <div className="grid grid-cols-3 gap-6">
                      {/* Bot Card */}
                      <div className="col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-discord-400 to-discord-600 rounded-xl flex items-center justify-center">
                              <BoltIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-white">MegaBot Ultra</h3>
                              <p className="text-gray-400">Prefix: !</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gray-400 rounded-full animate-bot-online"></div>
                            <span className="text-gray-400">
                              <span className="animate-bot-status-offline">Offline</span>
                              <span className="animate-bot-status-online hidden">Online</span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Console */}
                        <div className="bg-black rounded-lg p-4 font-mono text-sm h-48 overflow-hidden mb-6">
                          <div className="text-gray-400 animate-console-line-1">&gt; Initializing bot...</div>
                          <div className="text-gray-400 animate-console-line-2">&gt; Loading modules...</div>
                          <div className="text-gray-400 animate-console-line-3">&gt; Connecting to Discord...</div>
                          <div className="text-green-400 animate-console-line-4">&gt; Bot is online!</div>
                          <div className="text-blue-400 animate-console-line-5">&gt; Joined 0 servers</div>
                          <div className="text-yellow-400 animate-console-line-6">&gt; Ready to accept commands_</div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-4">
                          <button className="animate-cursor-click-3 flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all flex items-center justify-center">
                            <PlayIcon className="w-5 h-5 mr-2" />
                            Start Bot
                          </button>
                          <button className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all">
                            <CpuChipIcon className="w-5 h-5 mr-2 inline" />
                            Configure
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="space-y-4">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                          <h4 className="text-gray-400 text-sm mb-2">Commands Run</h4>
                          <p className="text-3xl font-bold text-white animate-count-up">0</p>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                          <h4 className="text-gray-400 text-sm mb-2">Users Served</h4>
                          <p className="text-3xl font-bold text-white">0</p>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                          <h4 className="text-gray-400 text-sm mb-2">Uptime</h4>
                          <p className="text-3xl font-bold text-green-400">100%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make bot development a breeze
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  index === activeFeature ? 'ring-2 ring-discord-500 shadow-lg' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-6 ${
                  index === activeFeature ? 'scale-110' : ''
                } transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
                {index === activeFeature && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="w-16 h-1 bg-gradient-to-r from-discord-500 to-discord-600 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-discord-50 to-transparent opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get started in 3 simple steps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              No complex setup. No infrastructure headaches. Just bots.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Animated connection line */}
            <div className="hidden md:block absolute top-20 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-discord-200 via-discord-400 to-discord-200">
              <div className="absolute inset-0 bg-gradient-to-r from-discord-400 to-discord-600 animate-pulse"></div>
            </div>
            
            <div className="text-center relative">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-gradient-to-br from-discord-400 to-discord-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                  <UserGroupIcon className="w-10 h-10" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Connect Discord</h3>
              <p className="text-gray-600">Sign in with Discord and authorize FiveBot to manage your bots</p>
            </div>
            <div className="text-center relative">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-gradient-to-br from-discord-400 to-discord-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                  <CpuChipIcon className="w-10 h-10" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Configure Bot</h3>
              <p className="text-gray-600">Use our visual builder or import your existing bot code</p>
            </div>
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-discord-400 to-discord-600 text-white rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                <RocketLaunchIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Deploy & Scale</h3>
              <p className="text-gray-600">Hit deploy and watch your bot come to life instantly</p>
            </div>
          </div>        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple pricing, powerful features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect plan for your needs. Always flexible to scale.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl ${
                  plan.popular 
                    ? 'ring-2 ring-discord-500 shadow-xl scale-105' 
                    : 'shadow-sm hover:shadow-lg'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-discord-500 to-discord-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <StarIcon className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                    {plan.savings && (
                      <span className="block text-sm text-green-600 font-medium mt-2">{plan.savings}</span>
                    )}
                  </div>
                  
                  <Link
                    href="/auth/login"
                    className={`block w-full text-center py-3 px-6 rounded-xl font-medium transition-all ${
                      plan.popular
                        ? 'bg-discord-600 text-white hover:bg-discord-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  
                  <div className="mt-8 space-y-4">
                    <p className="text-sm font-medium text-gray-900">Everything in {plan.name}:</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by communities worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what Discord server owners are saying about FiveBot
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-gray-50 rounded-2xl p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-discord-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about FiveBot
            </p>
          </div>
          <div className="space-y-8">
            {[
              {
                q: "How quickly can I deploy a bot?",
                a: "Most bots deploy in under 10 seconds. Our automated system handles everything from containerization to cloud deployment instantly."
              },
              {
                q: "Do I need coding experience?",
                a: "Not at all! Our visual builder lets you create powerful bots without writing a single line of code. Advanced users can import their own code too."
              },
              {
                q: "What happens if my bot goes offline?",
                a: "Our 99.9% uptime SLA ensures your bot stays online. If anything happens, our auto-restart system kicks in within seconds, and you'll get instant notifications."
              },
              {
                q: "Can I migrate my existing bot?",
                a: "Yes! We support all major bot frameworks. Just upload your code, and we'll handle the containerization and deployment automatically."
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-discord-500 to-discord-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-discord-400/20 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6">
            <FireIcon className="w-4 h-4 mr-2" />
            Limited time: Get 500 bonus credits
          </div>
          <h2 className="text-5xl font-bold text-white mb-6">
            Your bots deserve better
          </h2>
          <p className="text-xl text-discord-100 mb-8 max-w-2xl mx-auto">
            Stop struggling with complex deployments. Start building amazing Discord experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={user ? "/dashboard" : "/auth/login"}
              className="group inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-discord-600 bg-white rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 hover:shadow-2xl"
            >
              Claim Your Free Credits
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="https://docs.fivebot.app"
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-white border-2 border-white/20 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              <DocumentTextIcon className="mr-2 w-5 h-5" />
              Read Documentation
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-white/80 text-sm">
            <div className="flex items-center">
              <CheckIcon className="w-4 h-4 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckIcon className="w-4 h-4 mr-2" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <CheckIcon className="w-4 h-4 mr-2" />
              24/7 support
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-discord-500 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">FiveBot</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                The most powerful platform for creating and managing Discord bots. 
                Built by developers, for developers.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 FiveBot. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}