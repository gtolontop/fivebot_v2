"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RocketLaunchIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    name: "Création automatisée",
    description:
      "Créez et déployez des bots Discord en quelques clics avec notre interface intuitive.",
    icon: RocketLaunchIcon,
  },
  {
    name: "Sécurité avancée",
    description:
      "Tokens chiffrés, validation stricte et contrôle d'accès pour protéger vos bots.",
    icon: ShieldCheckIcon,
  },
  {
    name: "Orchestration Docker",
    description:
      "Chaque bot s'exécute dans son propre container isolé pour une performance optimale.",
    icon: CpuChipIcon,
  },
  {
    name: "Interface moderne",
    description:
      "Dashboard web complet avec monitoring en temps réel et configuration avancée.",
    icon: SparklesIcon,
  },
];

const pricingPlans = [
  {
    name: "Gratuit",
    price: "0",
    description: "Parfait pour commencer",
    features: [
      "100 crédits gratuits",
      "Jusqu'à 5 bots",
      "Support communautaire",
      "Messages de bienvenue",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "9.99",
    description: "Pour les créateurs actifs",
    features: [
      "1000 crédits/mois",
      "Bots illimités",
      "Support prioritaire",
      "Analytics avancées",
      "Custom commands",
    ],
    cta: "Bientôt disponible",
    popular: true,
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Suppression de la redirection automatique pour permettre de voir la landing page

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="discord-spinner w-8 h-8 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-50 to-indigo-100">
      {/* Header */}
      <header className="relative bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gradient">FiveBot v2</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">
                    Bonjour, {user.username}!
                  </span>
                  <Link href="/dashboard" className="btn-primary">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="http://localhost:8000/api/auth/discord"
                    className="btn-secondary"
                  >
                    Se connecter avec Discord
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Gérez vos bots Discord
              <span className="text-gradient block">comme un pro</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              FiveBot v2 est la plateforme ultime pour créer, déployer et gérer
              vos bots Discord. Interface moderne, sécurité avancée et
              orchestration automatisée.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={user ? "/dashboard" : "/auth/login"}
                className="btn-primary text-lg px-8 py-3"
              >
                {user ? "Aller au Dashboard" : "Commencer gratuitement"}
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="btn-secondary text-lg px-8 py-3"
              >
                En savoir plus
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              100 crédits gratuits • Aucune carte de crédit requise
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des fonctionnalités puissantes pour créer et gérer vos bots
              Discord facilement.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-discord-100 rounded-lg mb-4">
                  <feature.icon className="h-6 w-6 text-discord-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              Commencez gratuitement, passez à l\'échelle selon vos besoins.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`card p-8 relative ${
                  plan.popular ? "ring-2 ring-discord-500 shadow-lg" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
                    <span className="bg-discord-500 text-white px-3 py-1 text-sm font-semibold rounded-full">
                      Populaire
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      €{plan.price}
                    </span>
                    {plan.price !== "0" && (
                      <span className="text-gray-600">/mois</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-success-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`btn w-full ${
                    plan.popular ? "btn-primary" : "btn-secondary"
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
      <section className="py-24 bg-discord-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à créer votre premier bot ?
          </h2>
          <p className="text-xl text-discord-100 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de créateurs qui font confiance à FiveBot v2
            pour gérer leurs bots Discord.
          </p>
          <Link
            href={user ? "/dashboard" : "/auth/login"}
            className="btn bg-white text-discord-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            {user ? "Aller au Dashboard" : "Commencer maintenant"}
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">FiveBot v2</h3>
            <p className="text-gray-400 mb-6">
              La plateforme de gestion de bots Discord de nouvelle génération.
            </p>
            <p className="text-sm text-gray-500">
              © 2024 FiveBot Team. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
