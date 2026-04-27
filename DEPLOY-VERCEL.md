# 🚀 Déploiement sur Vercel — 5 minutes

## Étape 1 — Connecter Vercel à GitHub

1. Va sur **[vercel.com](https://vercel.com)**
2. Clique **"Sign Up"** (ou "Login") → choisis **"Continue with GitHub"**
3. Autorise Vercel à accéder à tes repos GitHub

---

## Étape 2 — Importer le repo

1. Sur le dashboard Vercel → clique **"Add New..."** → **"Project"**
2. Trouve le repo **`dashboard`** dans la liste → clique **"Import"**
3. **Ne change rien** dans la config par défaut

---

## Étape 3 — Ajouter les variables d'environnement (CRITIQUE)

Avant de cliquer "Deploy", ouvre la section **"Environment Variables"** :

| Name | Value |
|---|---|
| `WITHINGS_CLIENT_ID` | `56e3a4dbeadf02b036a408d587e6db1961f2ab6b9790bfe79009fb826be8b861` |
| `WITHINGS_CLIENT_SECRET` | `274de3e024f6312b812470ae04cd5959b078b926106e7e97bbc55e1067a28d86` |

> ⚠️ Ces variables restent **uniquement** sur les serveurs Vercel. Elles ne sont jamais visibles depuis le navigateur.

Puis clique **"Deploy"**.

---

## Étape 4 — Récupérer ton URL

Vercel te donne une URL du genre :
```
https://dashboard-cadjeenail.vercel.app
```

(Le nom exact apparaît à la fin du déploiement.)

---

## Étape 5 — Mettre à jour la Callback URL Withings

1. Va sur [developer.withings.com](https://developer.withings.com)
2. Ouvre ton app **"Mon Dashboard Vie"**
3. Dans **"Callback URL"**, mets ton URL Vercel :
   ```
   https://TON-URL.vercel.app/
   ```
4. Sauvegarde

---

## ✅ C'est prêt

Va sur ton URL Vercel → clique **"Connecter Withings"** → ça marche.

À chaque `git push` sur GitHub, Vercel re-déploie automatiquement (en ~30 secondes).

---

## 🔒 Récap sécurité

| Élément | Où c'est stocké | Visible par le navigateur ? |
|---|---|---|
| `CLIENT_ID` | code source GitHub | ✅ oui (c'est public) |
| `CLIENT_SECRET` | variable d'env Vercel | ❌ jamais |
| Tokens Withings | localStorage du navigateur | ✅ oui (sur ton appareil seulement) |
| PIN du dashboard | localStorage en SHA-256 | ❌ irréversible |
