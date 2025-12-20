# La Cave à Tournel - PWA

Application PWA Next.js pour la gestion de cave à vin, avec Supabase et authentification anonyme.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ 
- Compte Supabase avec une base de données configurée
- Variables d'environnement Supabase

### Installation

1. Cloner le projet
```bash
git clone <repo-url>
cd cave-vin-pwa
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Lancer le serveur de développement
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📦 Déploiement sur Vercel

### 1. Préparer le projet

- Assurez-vous que tous les fichiers sont commités dans Git
- Vérifiez que le build fonctionne localement : `npm run build`

### 2. Déployer sur Vercel

1. Connectez votre dépôt GitHub à [Vercel](https://vercel.com)
2. Configurez les variables d'environnement dans **Settings > Environment Variables** :
   - `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase

3. Vercel détectera automatiquement Next.js et utilisera les scripts `build` et `start`

### 3. Vérifier le déploiement

- Le build Vercel utilisera `npm run build` (qui inclut `--webpack` pour `next-pwa`)
- La PWA sera automatiquement générée en production
- Le service worker sera disponible à `/sw.js`

## 📱 Installation PWA

Une fois déployée sur Vercel, l'application peut être installée comme PWA :

- **Chrome/Edge** : Menu > Installer l'application
- **Safari (iOS)** : Partager > Sur l'écran d'accueil
- **Firefox** : Menu > Installer

## 🔧 Configuration

### Variables d'environnement requises

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Dashboard Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Dashboard Supabase > Settings > API |

### Structure de la base de données

La table `bottles` doit contenir les colonnes :
- `nom` (text)
- `annee` (integer, nullable)
- `prix` (numeric, nullable)
- `garde` (text, nullable)
- `clayette` (text)
- `position` (integer)
- `user_id` (uuid, avec DEFAULT auth.uid())
- `created_at` (timestamp)

## 🛠️ Scripts disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run start    # Serveur de production
npm run lint     # Linter ESLint
```

## 📚 Technologies

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Backend + Auth anonyme)
- **next-pwa** (Service Worker + Manifest)

## 🐛 Résolution de problèmes

### Erreur "Variables d'environnement manquantes"

Assurez-vous que `.env.local` est présent et contient les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Erreur RLS sur Supabase

Vérifiez que les policies Row-Level Security permettent l'accès aux utilisateurs authentifiés (anonymes ou non).

### PWA ne s'installe pas

- Vérifiez que vous êtes en HTTPS (requis pour PWA)
- Vérifiez que le manifest est accessible à `/manifest.webmanifest`
- Vérifiez les logs du navigateur pour les erreurs de service worker
