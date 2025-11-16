#!/bin/bash
# Script de déploiement des correctifs AI

echo "🚀 Déploiement des correctifs AI pour GPT-5-nano..."

cd /home/fivebot/app || exit 1

echo "📦 Récupération du code..."
git pull origin main

echo "🔨 Build du bot-template..."
cd bot-template
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build réussi"
else
  echo "❌ Erreur lors du build"
  exit 1
fi

echo "🔄 Redémarrage des services..."
pm2 restart all

echo "📊 Statut des services..."
pm2 status

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "Pour tester:"
echo "1. Mentionne le bot dans Discord"
echo "2. Vérifie les logs: pm2 logs --lines 50 | grep -i AI"
