# Younes Academy — Maths Collège

Plateforme éducative bilingue (arabe/français) dédiée aux mathématiques du collège marocain :
**1AC, 2AC et 3AC**.

## Expérience élève

- Connexion sécurisée par téléphone WhatsApp + mot de passe
- Tableau de bord avec progression réelle
- Cours organisés par niveau, chapitre et leçon
- Vidéos, PDF et ressources pédagogiques
- Sessions live et bibliothèque de replays
- Exercices, quiz, devoirs et correction côté serveur
- Résultats et historique des tentatives
- Accès au contenu selon l'inscription active

## Expérience enseignant / administration

- Studio de création Course → Chapter → Lesson
- Publication contrôlée des contenus
- Programmation des lives et ajout des replays
- Création des exercices et quiz
- Gestion des élèves, niveaux, groupes et accès
- Séparation des rôles STUDENT / TEACHER / ADMIN

## Organisation académique V1

- Année : 2026/2027
- Niveaux : 1AC, 2AC, 3AC
- Matière : Mathématiques
- Axes : nombres & algèbre, géométrie & mesure

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- PostgreSQL / Neon, Drizzle ORM
- Déploiement prévu sur Vercel

## Variables requises

Copier uniquement les noms depuis `.env.example`. Ne jamais committer de secrets.

- `APP_URL`
- `AUTH_SECRET`
- `DATABASE_URL`

## Vérification

```bash
npm ci
npm run test:qa
npm run typecheck
npm run lint
npm run build
```

## Identité

- Marque : **Younes Academy**
- Positionnement : **Mathématiques Collège**
- Niveaux : **1AC · 2AC · 3AC**
- Langues : arabe RTL et français LTR

L'identité officielle utilise le bleu nuit, le cyan et le blanc. Les portraits
réels de Younes sont intégrés à l'accueil, à la connexion et à la présentation.
