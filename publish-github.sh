#!/bin/bash

# Styling colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}     Job Hunter Agent - GitHub Publishing Tool         ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null
then
    echo -e "${RED}[x] Git n'est pas installé sur ce système.${NC}"
    echo -e "Veuillez installer Git avant de lancer ce script."
    exit 1
fi

# Initialize git repository if not done
if [ ! -d .git ]; then
    echo -e "${BLUE}[i] Initialisation du dépôt Git local...${NC}"
    git init
    echo -e "${GREEN}[✓] Dépôt Git initialisé.${NC}"
else
    echo -e "${GREEN}[✓] Dépôt Git déjà existant.${NC}"
fi

# Stage files
echo -e "${BLUE}[i] Ajout des fichiers au staging...${NC}"
git add .
echo -e "${GREEN}[✓] Fichiers ajoutés (en respectant le .gitignore).${NC}"

# Commit files
echo -e "${BLUE}[i] Création du commit initial...${NC}"
git commit -m "feat: initial commit - Job Hunter Agent Dashboard"
echo -e "${GREEN}[✓] Commit créé.${NC}"

# Configure GitHub Remote
echo ""
echo -e "${CYAN}------------------------------------------------------${NC}"
echo -e "Entrez les détails de votre dépôt GitHub pour publier le code."
echo -e "Veuillez créer un dépôt VIDE sur GitHub (https://github.com/new)"
echo -e "sans README, sans LICENSE, sans .gitignore."
echo -e "${CYAN}------------------------------------------------------${NC}"

read -p "Entrez votre nom d'utilisateur GitHub: " github_user
read -p "Entrez le nom du dépôt GitHub créé: " github_repo

if [ -z "$github_user" ] || [ -z "$github_repo" ]; then
    echo -e "${RED}[x] Nom d'utilisateur ou dépôt vide. Publication annulée.${NC}"
    exit 1
fi

# Check if origin already exists
git remote remove origin &> /dev/null

# Add remote origin
REMOTE_URL="https://github.com/${github_user}/${github_repo}.git"
echo -e "${BLUE}[i] Liaison du dépôt distant : ${REMOTE_URL}...${NC}"
git remote add origin "$REMOTE_URL"

# Rename branch to main
git branch -M main

echo ""
echo -e "${YELLOW}Voulez-vous pousser le code immédiatement sur GitHub ? (y/n)${NC}"
read -p "Choix: " push_choice

if [ "$push_choice" = "y" ] || [ "$push_choice" = "Y" ]; then
    echo -e "${BLUE}[i] Envoi du code sur GitHub (branche main)...${NC}"
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[✓] Code publié avec succès sur GitHub !${NC}"
        echo -e "Lien du dépôt : https://github.com/${github_user}/${github_repo}"
    else
        echo -e "${RED}[x] Erreur lors de l'envoi. Vérifiez vos droits d'accès ou vos identifiants GitHub.${NC}"
    fi
else
    echo -e "${GREEN}[✓] Dépôt Git configuré localement.${NC}"
    echo -e "Pour publier plus tard, exécutez la commande suivante :"
    echo -e "  ${CYAN}git push -u origin main${NC}"
fi

echo ""
echo -e "${BLUE}======================================================${NC}"
