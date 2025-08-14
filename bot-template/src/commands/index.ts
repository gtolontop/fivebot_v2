import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('set-welcome')
    .setDescription('Configure le message de bienvenue')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Activer ou désactiver le message de bienvenue')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Canal où envoyer le message de bienvenue')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Titre du message de bienvenue')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description du message de bienvenue (utilisez {user} pour mentionner)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Couleur de l\'embed (format hex: #5865F2)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('Affiche le statut et la configuration du bot'),

  new SlashCommandBuilder()
    .setName('reload-config')
    .setDescription('Recharge la configuration du bot depuis la base de données'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide du bot'),
].map(command => command.toJSON());