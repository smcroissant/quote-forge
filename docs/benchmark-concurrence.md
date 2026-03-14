# 📊 Benchmark Concurrence — CroissantDevis

**Version :** 1.0  
**Date :** 2026-03-14  
**Auteur :** Esther (PM)  
**Note :** Benchmark basé sur connaissances produit. À compléter avec tests manuels.

---

## Vue d'ensemble

| Solution | Type | Prix | Cible principale | Force | Faiblesse |
|----------|------|------|-------------------|-------|-----------|
| **Henrri** | Logiciel devis/facturation FR | Gratuit (toutes fonctionnalités) | Freelances, TPE | 100% gratuit, complet, FR | UI vieillissante, pas de suivi email, pas de SaaS cloud |
| **Qonto Billing** | Module devis/facture (néo-banque) | Inclus dans abonnement Qonto (9-49€/mois) | Freelances, PME | Tout-en-un (banque + facturation), design soigné | Vendu avec compte bancaire, devis pas le coeur, pas de standalone |
| **Facture.net** | Logiciel devis/factures en ligne | Gratuit (pub) / Premium ~7€/mois | TPE, artisans | Simple, gratuit avec pub, FR | Pub intrusive, UX datée, pas de suivi |
| **Devis-factures.com** | Outil devis/factures | Freemium (~12€/mois) | Artisans, TPE | Spécialisé artisans | UX faible, peu de différenciation |
| **Pennylane** | Compta + facturation | 14-79€/mois | PME (comptables) | Très complet, compta intégrée | Cher pour un freelance, complexe, devis = fonction secondaire |
| **Indy (ex Georges)** | Compta auto-entrepreneur | 0-24€/mois | Auto-entrepreneurs | Compta automatisée, FR | Pas de module devis dédié |
| **Canva** | Design graphique | Freemium (0-12€/mois) | Tout le monde | Beaux templates, connu | Pas fait pour les devis, zéro fonctionnalité métier (suivi, CRM) |
| **PandaDoc** | Propositions commerciales | 19-49$/mois | Sales teams, entreprises | Très complet, tracking avancé | Cher, US-centric, overkill pour freelances |
| **Proposify** | Propositions commerciales | 49$/mois | Agences | Beaux templates, e-signatures | Cher, pas FR, pas adapté micro |

---

## Analyse détaillée des 4 principaux concurrents

### 1. Henrri 🇫🇷

**Ce qu'ils font bien :**
- 100% gratuit, zéro freemium — message puissant
- Logiciel desktop (pas de dépendance internet)
- Devis + factures + avoirs + rappels
- Made in France, respect vie privée

**Ce qu'ils font mal :**
- Logiciel desktop = pas de cloud, pas de synchro multi-devices
- Interface vieillissante (design années 2015)
- Pas d'email tracking (on ne sait pas si le client a ouvert)
- Pas de lien de paiement intégré
- Pas de suivi pipeline commercial
- Pas de templates modernes / brandés

**Notre angle :** "Henrri pour la génération SaaS — cloud, beau, suivi, même gratuit pour commencer"

---

### 2. Qonto Billing 🏦

**Ce qu'ils font bien :**
- Design très soigné (comme tout Qonto)
- Intégration bancaire = paiements faciles
- CRM client basique intégré
- Marque forte et trust

**Ce qu'ils font mal :**
- Inclus dans un pack bancaire (pas standalone)
- Devis = fonction secondaire, pas le coeur
- Pas de tracking d'ouverture du devis
- Pas de templates personnalisables (design fixe)
- Prix d'entrée = coût du compte Qonto (9€/mois minimum)

**Notre angle :** "Tout la puissance devis de Qonto, sans avoir besoin d'une banque — et gratuit pour commencer"

---

### 3. Facture.net 🇫🇷

**Ce qu'ils font bien :**
- Gratuit avec pub = très accessible
- Basique mais fonctionnel
- Bon référencement naturel (domaine exact match)

**Ce qu'ils font mal :**
- Pub intrusive dans l'interface (horrible UX)
- Design très daté
- Pas de suivi d'ouverture
- Pas de PDF branded (ou limité)
- Pas de lien de paiement
- Pas d'évolution produit visible

**Notre angle :** "La simplicité de Facture.net, sans la pub, avec le suivi en bonus"

---

### 4. Pennylane 🇫🇷

**Ce qu'ils font bien :**
- Plateforme financière très complète
- Design moderne
- Compta automatisée
- Ciblage PME/ETI fort

**Ce qu'ils font mal :**
- Cher pour un freelance (14€/mois minimum)
- Complexe (compta, banque, RH…)
- Devis = une fonction parmi 20
- Overkill si on veut juste faire des devis
- Onboarding long

**Notre angle :** "Pennylane est top pour la compta. Mais si vous voulez juste des devis rapides et beaux, CroissantDevis est 10x plus simple."

---

## Matrice de positionnement

```
                    Simplicité
                        ↑
                        |
          CroissantDevis ★
                        |
      Henrri            |         Facture.net
                        |
   ─────────────────────┼────────────────────→ Fonctionnalités
                        |
                    Indy    |        Qonto Billing
                        |
                        |      PandaDoc / Pennylane
                        |
                        ↓
                   Complexité
```

**CroissantDevis = coin simplicité-fonctionnalité** (juste assez de features, UX épurée)

---

## Opportunités identifiées

| Gap marché | Opportunité CroissantDevis |
|-----------|---------------------------|
| Personne ne fait bien l'email tracking des devis | ✅ Feature différenciante |
| Peu d'outils avec offre gratuite SANS pub | ✅ Freemium propre |
| Les outils FR ont une UX vieillissante | ✅ Design moderne (shadcn/ui) |
| Qonto est le seul avec un bon design mais n'est pas standalone | ✅ Outil dédié devis |
| Personne ne cible spécifiquement les micro-entrepreneurs en création | ✅ Angle ads "logiciel devis gratuit" |
| Pas de lien de paiement intégré (à part Qonto) | ✅ Feature v2 avec Stripe |

---

## Risques

| Risque | Mitigation |
|--------|-----------|
| Qonto ajoute des features devis standalone | On est plus simple et moins cher |
| Henrri passe au cloud | Ils n'ont pas l'ADN SaaS, lente à évoluer |
| Nouveaux entrants US (PandaDoc FR) | On parle français, on est français, on connaît le marché |
| Free tier trop généreux → pas de conversion | Limiter à 5 devis/mois, upgrade doux |

---

## Recommandations stratégiques

1. **Commencer par le freemium généreux** — le marché FR est sensible au "gratuit", c'est notre cheval de Troie
2. **L'email tracking comme feature phare** — c'est ce qui convertira Free → Pro
3. **Design comme différenciateur** — les concurrents FR ont une UX vieillissante, on doit être le plus beau
4. **SEO sur "logiciel devis gratuit"** — intent forte, CPC bas, volume décent
5. **Ne pas entrer dans la course features** — rester focus "devis", pas de compta, pas de RH

---

*À mettre à jour trimestriellement avec les évolutions du marché.*
