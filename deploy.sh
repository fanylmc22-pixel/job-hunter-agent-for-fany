#!/bin/bash

# Styling colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${PURPLE}======================================================${NC}"
echo -e "${PURPLE}       Job Hunter Agent - Vercel Deployment           ${NC}"
echo -e "${PURPLE}======================================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo -e "${YELLOW}[!] Vercel CLI n'est pas installé.${NC}"
    echo -e "Installation de Vercel CLI via npm..."
    npm install -g vercel
else
    echo -e "${GREEN}[✓] Vercel CLI est installé.${NC}"
fi

# Ensure user is logged in
echo -e "${BLUE}[i] Vérification de votre connexion Vercel...${NC}"
echo -e "Si vous n'êtes pas connecté, une invite de connexion va s'ouvrir."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[!] Connexion nécessaire. Lancement de la connexion Vercel...${NC}"
    vercel login
else
    echo -e "${GREEN}[✓] Vous êtes connecté à Vercel.${NC}"
fi

# Ask about Database provider
echo ""
echo -e "${CYAN}------------------------------------------------------${NC}"
echo -e "${YELLOW}IMPORTANT: Choix de la Base de Données${NC}"
echo -e "Par défaut, ce projet utilise SQLite (local). Sur Vercel (serverless),"
echo -e "les fichiers SQLite sont éphémères et réinitialisés régulièrement."
echo -e "Pour un serveur persistant, il est RECOMMANDÉ d'utiliser PostgreSQL."
echo -e "${CYAN}------------------------------------------------------${NC}"
echo -e "Voulez-vous connecter une base de données PostgreSQL de production ?"
echo -e "1) Oui (Recommandé - Supabase, Neon, ou Vercel Postgres)"
echo -e "2) Non (Garder SQLite pour le moment - perte de données possible à chaque redémarrage)"
read -p "Votre choix (1 ou 2): " db_choice

# Write or notify prisma schema change
if [ "$db_choice" = "1" ]; then
    echo ""
    echo -e "${BLUE}[i] Pour utiliser PostgreSQL, les étapes suivantes seront nécessaires :${NC}"
    echo -e "  1. Remplacez le provider par 'postgresql' dans ${YELLOW}prisma/schema.prisma${NC}:"
    echo -e "     datasource db {"
    echo -e "       provider = \"postgresql\""
    echo -e "       url      = env(\"DATABASE_URL\")"
    echo -e "     }"
    echo -e "  2. Configurez la variable ${GREEN}DATABASE_URL${NC} sur Vercel avec le lien de votre base de données."
    echo -e "  3. L'agent poussera automatiquement le schéma lors du déploiement."
    echo ""
    read -p "Appuyez sur Entrée une fois prêt à continuer..."
fi

# Pull .env variables for deploy setup
echo -e "${BLUE}[i] Récupération des clés d'environnement locales...${NC}"
# Source local .env if exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Deploy command
echo -e "${BLUE}[i] Déploiement sur Vercel...${NC}"
echo -e "Création du projet et déploiement initial."
vercel

echo ""
echo -e "${GREEN}[✓] Déploiement initial complété !${NC}"
echo -e "Afin que l'agent de recherche d'emploi fonctionne sur Vercel,"
echo -e "veuillez ajouter vos variables d'environnement si elles ne sont pas encore configurées."
echo ""
echo -e "Pour configurer les variables sur Vercel :"
echo -e "  ${CYAN}vercel env add GEMINI_API_KEY${NC}  (Clé API Google Gemini)"
echo -e "  ${CYAN}vercel env add GMAIL_USER${NC}      (Adresse email d'expédition)"
echo -e "  ${CYAN}vercel env add GMAIL_APP_PASSWORD${NC} (Mot de passe d'application)"
if [ "$db_choice" = "1" ]; then
    echo -e "  ${CYAN}vercel env add DATABASE_URL${NC}      (Lien Postgres de production)"
fi
echo ""
echo -e "Ensuite, relancez un déploiement de production :"
echo -e "  ${GREEN}vercel --prod${NC}"
echo ""
echo -e "${PURPLE}======================================================${NC}"
echo -e "${GREEN}Votre Job Hunter Agent est prêt à chasser !${NC}"
echo -e "${PURPLE}======================================================${NC}"
