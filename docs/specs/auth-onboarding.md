# ✅ Critères d'Acceptation — Auth & Onboarding

**Feature :** F1 — Authentification & Onboarding  
**Assigné :** David  
**Priorité :** P0 — Blocant (rien ne marche sans auth)  
**Références :** `cahier-des-charges.md` F1, US-1.1 à US-1.4

---

## 1. Inscription

### 1.1 Inscription par Email

**Scenario :** Nouvel utilisateur s'inscrit avec email + mot de passe

```
ÉTANT DONNÉ un visiteur sur la page /signup
QUAND il remplit :
  - Email valide (format RFC)
  - Mot de passe ≥ 8 caractères, 1 majuscule, 1 chiffre
  - Confirmation mot de passe identique
  - Coche "J'accepte les CGU"
ET clique sur "Créer mon compte"
ALORS :
  → Compte créé en base (users + sessions)
  → Email de vérification envoyé (si on fait du vérifié, sinon skip v1)
  → Redirection vers /onboarding
```

**Cas d'erreur :**

| Input | Comportement |
|---|---|
| Email déjà utilisé | Message inline : "Cet email est déjà utilisé. [Se connecter ?]" |
| Email invalide | Validation HTML5 + serveur, bordure rouge, message "Email invalide" |
| Mots de passe différents | Message "Les mots de passe ne correspondent pas" |
| Mot de passe trop faible | Liste des critères non respectés (affichée en temps réel) |
| Champs vides | Bouton "Créer mon compte" désactivé |
| Tentative bot (rate limit) | 429 après 5 tentatives/min, message "Trop de tentatives, réessayez" |

### 1.2 Inscription Google OAuth

**Scenario :** Utilisateur clique sur "Continuer avec Google"

```
ÉTANT DONNÉ un visiteur sur /signup ou /login
QUAND il clique sur "Continuer avec Google"
ALORS :
  → Popup/redirect vers Google OAuth
  → Si email Google pas en base → création compte + redirection /onboarding
  → Si email Google déjà en base → connexion directe + redirection /dashboard
  → Avatar Google récupéré automatiquement (photo de profil)
```

**Cas d'erreur :**

| Input | Comportement |
|---|---|
| Popup bloquée par navigateur | Fallback redirect full-page |
| User ferme la popup | Retour à /signup sans erreur |
| Erreur Google (500, timeout) | Message "Service temporairement indisponible, essayez l'email" |
| Email Google déjà lié à un autre compte | Message "Cet email est déjà utilisé via [email/password]" |

### 1.3 Inscription GitHub OAuth

Même logique que Google. Priorité B (peut être livré après).

---

## 2. Connexion

### 2.1 Connexion par Email

```
ÉTANT DONNÉ un utilisateur avec un compte existant
QUAND il saisit email + mot de passe valides
ET clique sur "Se connecter"
ALORS :
  → Session créée (Better Auth : access + refresh tokens)
  → Redirection vers /dashboard
  → Si "Se souvenir de moi" coché → session 30 jours (sinon 7 jours)
```

**Cas d'erreur :**

| Input | Comportement |
|---|---|
| Email inconnu | Message "Email ou mot de passe incorrect" (NE PAS dire "email inconnu" = faille sécurité) |
| Mauvais mot de passe | Même message générique |
| 5 tentatives échouées consécutives | Compte bloqué 15 min, email "Tentative de connexion suspecte" |
| Session active ailleurs | Autorisé (multi-device OK en v1) |

### 2.2 Connexion Google / GitHub

Même flow que inscription OAuth → détection auto du compte existant.

---

## 3. Déconnexion

```
ÉTANT DONNÉ un utilisateur connecté
QUAND il clique sur "Déconnexion" (menu profil)
ALORS :
  → Session actuelle détruite
  → Tous les tokens invalidés
  → Redirection vers /login
  → Les autres sessions (autres devices) restent actives
```

**Edge case :** Si déconnexion sur un device → les autres ne sont pas affectés.

---

## 4. Session & Persistance

### 4.1 Refresh automatique

```
ÉTANT DONNÉ un utilisateur avec session active
QUAND le token d'accès expire (15 min)
ALORS :
  → Refresh token utilisé automatiquement (côté client, transparent)
  → Nouveau access token émis
  → Pas de redirect ni de flash
```

### 4.2 Session expirée

```
ÉTANT DONNÉ un utilisateur dont la session est expirée (refresh aussi)
QUAND il fait une action (navigate, submit form)
ALORS :
  → 401 retourné par l'API
  → Client sauvegarde l'URL actuelle en local
  → Redirection vers /login?redirect=/devis/42/edit
  → Après reconnexion → retour sur la page d'origine
```

### 4.3 Auto-save en cas d'expiration pendant édition

```
ÉTANT DONNÉ un utilisateur qui édite un devis
QUAND sa session expire PENDANT la saisie
ALORS :
  → Le dernier auto-save local (localStorage) est préservé
  → Après reconnexion → message "Vous aviez un devis en cours de modification, restaurer ?"
  → Si oui → les données sont rechargées dans le formulaire
```

---

## 5. Wizard Onboarding (3 étapes)

### Étape 1 — Entreprise

```
ÉTANT DONNÉ un nouvel utilisateur (première connexion)
QUAND il arrive sur /onboarding
ALORS il voit :
  - Nom entreprise * (requis)
  - Logo (optionnel, max 2MB, PNG/JPG/SVG, preview avant upload)
  - Bouton "Suivant" (désactivé si nom vide)
  - Bouton "Passer" (en petit, gris)
```

**Validation logo :**
- Max 2MB → sinon message "Fichier trop volumineux (max 2MB)"
- Types acceptés : image/png, image/jpeg, image/svg+xml
- Preview immédiat après sélection
- Stockage : upload vers [storage à définir — S3-compatible ou local]

### Étape 2 — Secteur

```
ÉTANT DONNÉ un utilisateur à l'étape 2
QUAND il voit la liste des secteurs
ALORS :
  - Liste radio (un seul choix) :
    ○ Développement Web
    ○ Design / Création
    ○ Marketing / Communication
    ○ Conseil / Consulting
    ○ Artisanat / Services
    ○ Comptabilité / Juridique
    ○ Autre (champ texte libre)
  - "Suivant" désactivé tant que rien sélectionné
```

### Étape 3 — Devise & TVA

```
ÉTANT DONNÉ un utilisateur à l'étape 3 (dernière étape)
QUAND il configure devise et TVA
ALORS :
  - Devise : dropdown (EUR défaut, USD, GBP, CHF)
  - TVA % : dropdown (0%, 5.5%, 10%, 20% défaut)
  - Checkbox "Je suis assujetti à la TVA" (cochée par défaut)
  - Bouton "Terminer 🎉"
```

### Completion

```
QUAND l'utilisateur clique sur "Terminer 🎉"
ALORS :
  → Données sauvegardées dans le profil user
  → Redirection vers /dashboard
  → Toast "Bienvenue sur CroissantDevis ! Créez votre premier devis 🥐"
  → Le CTA "Nouveau devis" est mis en avant (spotlight/highlight)
```

### Skip

```
QUAND l'utilisateur clique sur "Passer" (à n'importe quelle étape)
ALORS :
  → Redirection directe vers /dashboard
  → Champs manquants marqués comme "à compléter"
  → Au moment de créer le PREMIER devis :
    → Modal "Complétez votre profil pour que vos devis soient professionnels"
    → Les champs entreprise (nom, adresse) sont requis pour générer un devis
```

---

## 6. Protection des Routes

| Route | Accès | Redirection si non connecté |
|---|---|---|
| `/login`, `/signup` | Public uniquement | → `/dashboard` si déjà connecté |
| `/onboarding` | Connecté, premier accès | → `/dashboard` si déjà onboardé |
| `/dashboard`, `/devis/*`, `/clients/*`, `/catalogue/*`, `/settings` | Connecté uniquement | → `/login?redirect=[url]` |
| `/q/[token]` (devis public) | Public, pas de session requise | — |

---

## 7. Sécurité — Checklist

- [ ] Mots de passe hashés (bcrypt, cost 12 via Better Auth)
- [ ] CSRF protection (Better Auth gère nativement)
- [ ] Rate limiting : 5 tentatives/min sur /login
- [ ] Refresh token rotation (chaque refresh → nouveau refresh token, ancien invalidé)
- [ ] Tokens httpOnly, secure, sameSite=strict
- [ ] Pas d'exposition d'info user dans les erreurs (pas "user not found")
- [ ] OAuth state parameter vérifié (anti-CSRF)
- [ ] Email de notif si connexion depuis nouveau device (stretch goal v2)

---

## 8. Tests Requis

### Unitaires
- Validation email (RFC compliant)
- Validation mot de passe (force check)
- Hash + verify password

### Intégration
- Signup flow complet (email)
- Signup flow complet (Google OAuth)
- Login → session → logout
- Refresh token rotation
- Session expiration → redirect
- Onboarding completion → profil sauvegardé

### E2E (Playwright)
- Signup → onboarding → dashboard (happy path)
- Login avec mauvais mot de passe (error path)
- Accès route protégée sans session → redirect login
- OAuth flow (mock Google)

---

## 9. Données de Test (Seed)

Pour le dev, fournir un user de test :
```
Email: test@croissantdevis.dev
Password: Test1234!
Entreprise: Dev Test Studio
Secteur: Développement Web
Devise: EUR
TVA: 20%
Onboarding: complété
```

---

*Document vivant — David, n'hésite pas à me poser des questions ou remonter des ambiguïtés. Je suis en temps réel.* 🎯
