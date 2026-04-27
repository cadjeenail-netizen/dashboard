# Mon Univers — Dashboard de vie

Dashboard personnel complet, déployable sur **GitHub Pages** en quelques clics.

## 🚀 Déploiement GitHub Pages

### 1. Créer le dépôt

```bash
cd dashboard-vie
git init
git add .
git commit -m "feat: dashboard de vie initial"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/dashboard-vie.git
git push -u origin main
```

### 2. Activer GitHub Pages

1. Ouvrir le dépôt sur github.com
2. **Settings → Pages**
3. Source : `Deploy from a branch` → branche `main` → dossier `/ (root)`
4. Cliquer **Save**
5. Ton dashboard sera disponible sur : `https://TON-USERNAME.github.io/dashboard-vie/`

> ⚠️ Les modules ES6 (`type="module"`) fonctionnent nativement sur GitHub Pages via HTTPS. Pas de configuration supplémentaire requise.

---

## 📁 Structure

```
dashboard-vie/
├── index.html                  ← Page principale
├── assets/
│   ├── css/
│   │   ├── main.css            ← Variables, reset, layout
│   │   ├── components.css      ← Cards, boutons, sections
│   │   └── animations.css      ← Transitions, fadeIn
│   ├── js/
│   │   ├── app.js              ← Orchestrateur principal
│   │   ├── clock.js            ← Heure/date live
│   │   ├── mood.js             ← Humeur + journaling
│   │   ├── habits.js           ← Habitudes hebdomadaires
│   │   ├── todo.js             ← Tâches
│   │   ├── goals.js            ← Objectifs + progress bars
│   │   ├── finance.js          ← Finances mockées
│   │   ├── quote.js            ← Citations inspirantes
│   │   └── storage.js          ← localStorage
│   └── fonts/                  ← Vide (polices via CDN)
└── README.md
```

---

## 🎨 Personnalisation

### Modifier les objectifs → `assets/js/goals.js`
```js
const GOALS = [
  { name: 'Mon objectif', pct: 60, color: 'goal-violet' },
  ...
];
```

### Modifier les finances → `assets/js/finance.js`
```js
const FINANCE = { solde: 2500, revenus: 1200, depenses: 450 };
const TRANSACTIONS = [ ... ];
```

### Modifier les habitudes → `assets/js/habits.js`
```js
const HABITS_DEFAULT = [
  { id: 'sport', icon: '🏃', name: 'Sport', days: [0,0,0,0,0,0,0] },
  ...
];
```

### Modifier les citations → `assets/js/quote.js`
```js
const QUOTES = [
  { text: 'Ta citation...', author: 'Auteur' },
  ...
];
```

---

## 💾 Persistance

Les données suivantes sont sauvegardées dans `localStorage` :
- ✅ Humeur du jour + journal
- ✅ Cases habitudes (cochées/décochées)
- ✅ Tâches (texte, état, priorité)

---

## 🛠️ Développement local

```bash
# Avec Python (intégré à macOS/Linux/Windows)
python -m http.server 8000

# Avec Node.js
npx serve .

# Avec VS Code
# Installer l'extension "Live Server" → clic droit index.html → Open with Live Server
```

> ⚠️ Ne pas ouvrir `index.html` directement en `file://` : les modules ES6 requièrent un serveur HTTP.

---

## ✨ Fonctionnalités

| Section      | Fonctionnalité                              |
|--------------|---------------------------------------------|
| ⏰ Horloge   | Heure live + date en français               |
| 👋 Greeting  | Salutation dynamique (matin/après-midi/soir)|
| 🎯 Score     | Ring SVG calculé (humeur + habitudes + objectifs) |
| ⛅ Météo     | Données mockées Saint-Denis La Réunion      |
| 😄 Humeur    | 5 niveaux + journal persisté               |
| 📅 Agenda    | Timeline verticale colorée                  |
| 🏃 Habitudes | 5 habitudes × 7 jours, persistées          |
| 🎯 Objectifs | 4 barres de progression animées             |
| 💰 Finances  | Solde / Revenus / Dépenses + transactions   |
| ✅ Tâches    | CRUD complet, priorités, persisté          |
| 💬 Citation  | 5 citations, cycle au clic                 |
