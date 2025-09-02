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
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    name: "Quick Setup",
    description:
      "Deploy Discord bots in seconds with our intuitive automated interface.",
    icon: RocketLaunchIcon,
  },
  {
    name: "Enterprise Security",
    description:
      "Encrypted tokens and complete Docker isolation for optimal bot protection.",
    icon: ShieldCheckIcon,
  },
  {
    name: "Real-time Analytics",
    description:
      "Monitor bot performance and activity with comprehensive metrics dashboard.",
    icon: ChartBarIcon,
  },
  {
    name: "Modern Interface",
    description:
      "Elegant responsive dashboard to manage all your bots from one place.",
    icon: SparklesIcon,
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect to get started",
    features: [
      "Up to 3 bots",
      "100 free credits",
      "Full dashboard access",
      "Community support",
    ],
    cta: "Start for free",
    popular: false,
  },
  {
    name: "Pro",
    price: "9.99",
    description: "For power users",
    features: [
      "Unlimited bots",
      "1000 credits/month",
      "Priority support",
      "Advanced analytics",
      "Custom webhooks",
    ],
    cta: "Coming soon",
    popular: true,
  },
];

const useCases = [
  {
    title: "Community Management",
    description: "Automate moderation, welcome messages, and role management",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: "Gaming Servers",
    description: "Stats tracking, tournament management, and game integrations",
    icon: CubeIcon,
  },
  {
    title: "Educational",
    description: "Quiz bots, scheduling, and resource management",
    icon: DocumentTextIcon,
  },
  {
    title: "Custom Solutions",
    description: "Build unique bots tailored to your specific needs",
    icon: CodeBracketIcon,
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-discord-100 to-blue-100">
        <div className="discord-spinner w-12 h-12 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-discord-500/20 rounded-full blur-3xl"
          style={{
            transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)`,
            left: "20%",
            top: "10%",
          }}
        />
        <div
          className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          style={{
            transform: `translate(${-mousePosition.x * 0.05}px, ${-mousePosition.y * 0.05}px)`,
            right: "20%",
            bottom: "10%",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 backdrop-blur-md bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent">
                FiveBot v2
              </h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">
                  Fonctionnalités
                </a>
                <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">
                  Tarifs
                </a>
                <a href="#stats" className="text-gray-300 hover:text-white transition-colors">
                  Statistiques
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-discord-400 to-purple-400 rounded-full"></div>
                    <span className="text-gray-300">{user.username}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="bg-gradient-to-r from-discord-500 to-discord-600 hover:from-discord-600 hover:to-discord-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:scale-105"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link
                  href="http://localhost:8000/api/auth/discord"
                  className="bg-gradient-to-r from-discord-500 to-discord-600 hover:from-discord-600 hover:to-discord-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-discord-500/10 border border-discord-500/20 mb-8">
              <StarIcon className="w-4 h-4 text-discord-400 mr-2" />
              <span className="text-sm text-discord-400">Plus de 2500 bots actifs</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold mb-6">
              La plateforme Discord
              <span className="block bg-gradient-to-r from-discord-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                nouvelle génération
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Créez, déployez et gérez vos bots Discord avec une technologie de pointe.
              Infrastructure cloud, sécurité renforcée et analytics en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={user ? "/dashboard" : "/auth/login"}
                className="group relative px-8 py-4 bg-gradient-to-r from-discord-500 to-discord-600 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-discord-500/25"
              >
                <span className="flex items-center">
                  {user ? "Accéder au Dashboard" : "Commencer maintenant"}
                  <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="#demo"
                className="group px-8 py-4 border border-gray-700 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all"
              >
                <span className="flex items-center">
                  <BeakerIcon className="mr-2 w-5 h-5" />
                  Voir la démo
                </span>
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Aucune carte requise
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Setup en 30 secondes
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Support 24/7
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center"
                style={{
                  transform: `translateY(${scrollY * 0.1 * (index + 1)}px)`,
                }}
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 mt-2">{stat.label}</div>
                <div className="text-sm text-green-400 mt-1">{stat.trend}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">
              Fonctionnalités{" "}
              <span className="bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent">
                révolutionnaires
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour créer des bots Discord professionnels
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.name}
                className="group relative p-8 rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-all hover:transform hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}
                />
                <div
                  className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.gradient} mb-4`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.name}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-discord-900/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">
              Plans{" "}
              <span className="bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent">
                flexibles
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Choisissez le plan qui correspond à vos besoins
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-gradient-to-b from-discord-500/20 to-discord-600/20 border-2 border-discord-500 transform scale-105"
                    : "bg-gray-800/50 border border-gray-700"
                } backdrop-blur-sm hover:transform hover:scale-105 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-discord-500 to-discord-600 text-white px-4 py-1 text-sm font-semibold rounded-full">
                      Plus populaire
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    {plan.price === "Custom" ? (
                      <span className="text-4xl font-bold">Sur devis</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">€{plan.price}</span>
                        {plan.price !== "0" && (
                          <span className="text-gray-400">/mois</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-discord-500 to-discord-600 hover:from-discord-600 hover:to-discord-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-discord-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl font-bold mb-6">
            Prêt à révolutionner vos{" "}
            <span className="bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent">
              bots Discord ?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Rejoignez des milliers de créateurs qui utilisent FiveBot v2 pour
            propulser leurs communautés vers de nouveaux sommets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={user ? "/dashboard" : "/auth/login"}
              className="group px-8 py-4 bg-gradient-to-r from-discord-500 to-discord-600 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-discord-500/25"
            >
              <span className="flex items-center justify-center">
                {user ? "Accéder au Dashboard" : "Démarrer maintenant"}
                <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a
              href="#"
              className="px-8 py-4 border border-gray-700 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all flex items-center justify-center"
            >
              <ChatBubbleBottomCenterTextIcon className="mr-2 w-5 h-5" />
              Parler à un expert
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-discord-400 to-purple-400 bg-clip-text text-transparent mb-4">
                FiveBot v2
              </h3>
              <p className="text-gray-400">
                La nouvelle génération de gestion de bots Discord.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ressources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    CGU
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2024 FiveBot Team. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
