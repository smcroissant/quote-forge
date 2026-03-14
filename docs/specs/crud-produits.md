# ✅ Critères d'Acceptation — CRUD Produits (Catalogue)

**Feature :** F7 — Catalogue de Produits/Services  
**Assigné :** Simon  
**Priorité :** P0 — Blocant (requis pour la création de devis)  
**Références :** `cahier-des-charges.md` F7, US-6.1 à US-6.3

---

## 1. Vue d'Ensemble

Le catalogue permet à l'utilisateur de sauvegarder ses prestations/services récurrents pour les réutiliser rapidement dans ses devis. C'est une bibliothèque réutilisable.

**Règle fondamentale :** Les données d'un produit dans le catalogue sont **copiées** dans le devis au moment de l'ajout. Modifier le catalogue n'affecte **jamais** les devis existants.

---

## 2. Modèle de Données

### 2.1 Produit

```typescript
interface Product {
  id: string                    // UUID
  userId: string                // Propriétaire (FK → users)
  name: string                  // Nom du produit/service (requis)
  description: string | null    // Description détaillée (optionnel)
  unitPrice: number             // Prix HT unitaire (requis, ≥ 0)
  vatRate: number               // Taux TVA en % (défaut: user.settings.defaultVatRate)
  unit: string                  // Unité : "forfait", "heure", "jour", "mois", "an", "pièce", "unité"
  categoryId: string | null     // FK → ProductCategory (optionnel)
  createdAt: Date
  updatedAt: Date
}
```

### 2.2 Catégorie

```typescript
interface ProductCategory {
  id: string                    // UUID
  userId: string                // Propriétaire
  name: string                  // Nom de la catégorie
  order: number                 // Ordre d'affichage (drag & drop futur)
  createdAt: Date
}
```

### 2.3 Contraintes

| Champ | Contrainte | Message d'erreur |
|---|---|---|
| `name` | Requis, 1-200 caractères | "Le nom est requis (max 200 caractères)" |
| `description` | Optionnel, max 2000 caractères | "Description trop longue (max 2000)" |
| `unitPrice` | Requis, ≥ 0, max 2 décimales | "Le prix doit être un nombre positif" |
| `vatRate` | Requis, entre 0 et 100 | "La TVA doit être entre 0 et 100%" |
| `unit` | Requis, dans liste prédéfinie | Sélection depuis dropdown, pas de saisie libre |
| `name + userId` | Unique (doublon de nom OK si catégories différentes) | "Un produit avec ce nom existe déjà dans cette catégorie" |

---

## 3. Page Liste — `/catalogue`

### 3.1 Layout

```
┌─────────────────────────────────────────────────┐
│ Mon catalogue    [+ Nouveau produit]            │
│                                                 │
│ [Rechercher...]  [Catégorie : Toutes ▼]         │
│                                                 │
│ 💻 Catégorie A                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Produit 1    |  3 500 € HT  |  forfait  [⋯]│ │
│ │ Produit 2    |    500 € HT  |  /mois    [⋯]│ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📊 Catégorie B                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Produit 3    | 1 200 € HT  |  /jour     [⋯]│ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📦 Sans catégorie                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Produit 4    |   800 € HT  |  forfait   [⋯]│ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [+ Nouvelle catégorie]                          │
└─────────────────────────────────────────────────┘
```

### 3.2 Comportements

**Chargement :**
- Produits groupés par catégorie
- Catégories triées par `order` puis alphabétique
- Produits dans chaque catégorie triés par nom
- "Sans catégorie" en dernier

**Recherche :**
- Champ de recherche avec debounce 300ms
- Recherche sur `name` ET `description` (insensible à la casse)
- Si résultats → afficher les catégories contenant des résultats uniquement
- Si aucun résultat → message "Aucun produit trouvé" + CTA "Créer [terme]"

**Menu actions `[⋯]` :**
- ✏️ Modifier
- 📋 Dupliquer
- 🗑️ Supprimer (avec confirmation)

**Pagination :**
- Pas de pagination en v1 (un user aura rarement > 100 produits)
- Si > 100 produits → scroll infiri ou pagination à ajouter en V2

---

## 4. Création de Produit — Modal/Sheet

### 4.1 Formulaire

```
┌─────────────────────────────────────────────────┐
│ Nouveau produit                          [×]    │
│                                                 │
│ Nom du produit *                                │
│ [Site vitrine                           ]       │
│                                                 │
│ Description (optionnel)                         │
│ [Création d'un site vitrine responsive...]      │
│ [...............................................]│
│                                                 │
│ Prix HT *                                       │
│ [3 500.00] €                                    │
│                                                 │
│ TVA                                             │
│ [20% ▼]                                         │
│                                                 │
│ Unité *                                         │
│ [forfait ▼]                                     │
│                                                 │
│ Catégorie                                       │
│ [💻 Développement ▼]     [ou + Nouvelle]        │
│                                                 │
│        [Annuler]         [Créer le produit]     │
└─────────────────────────────────────────────────┘
```

### 4.2 Validation

**Temps réel (client) :**
- Nom : rouge si vide au blur
- Prix : accepte virgule ou point (2500,50 ou 2500.50), convertit en float
- TVA : pré-rempli avec `user.settings.defaultVatRate`

**À la soumission (serveur) :**
- Toutes les contraintes modèle (§ 2.3)
- Injection SQL/XSS : sanitisation via Drizzle (parameterized queries)

### 4.3 Comportement post-création

```
QUAND le produit est créé avec succès
ALORS :
  → Modal fermé
  → Le produit apparaît dans la bonne catégorie (si créée en ligne)
  → Toast "Produit [nom] créé ✅"
  → Le catalogue est rafraîchi (optimistic update ou refetch)
```

---

## 5. Modification de Produit

### 5.1 Même formulaire que la création, pré-rempli

```
QUAND l'utilisateur clique "Modifier" sur un produit
ALORS :
  → Modal ouvert avec les données actuelles
  → Mêmes validations que la création
  → Bouton "Sauvegarder" (au lieu de "Créer")
```

### 5.2 Impact sur les devis existants

```
RÈGLE ABSOLUE :
QUAND un produit du catalogue est modifié
ALORS :
  → Les devis EXISTANTS ne sont PAS affectés
  → Seuls les NOUVEAUX devis utiliseront les nouvelles valeurs
  → Un devis contient une COPIE des données produit au moment de l'ajout
```

**Implémentation :** Les lignes de devis (`quote_lines`) stockent leurs propres `name`, `unitPrice`, `vatRate`, `unit` — pas de FK vers `products`. Le catalogue est juste un raccourci de saisie.

### 5.3 Cas d'erreur

| Cas | Comportement |
|---|---|
| Modification pendant qu'un devis l'utilise | OK, le devis n'est pas affecté |
| Suppression d'une catégorie alors que des produits y sont | Produits → "Sans catégorie" (pas de suppression en cascade) |
| Deux utilisateurs modifient le même produit | Impossible (produits isolés par `userId`) |

---

## 6. Suppression de Produit

```
QUAND l'utilisateur clique "Supprimer"
ALORS :
  → Modal de confirmation :
    "Supprimer [nom] ?"
    "Cette action est irréversible."
    [Annuler] [Supprimer]
  → Si confirmé → suppression en base
  → Toast "Produit supprimé"
  → Le produit disparaît de la liste
```

**Impact sur devis existants :** Aucun. Les devis gardent leurs copies.

---

## 7. Duplication de Produit

```
QUAND l'utilisateur clique "Dupliquer"
ALORS :
  → Nouveau produit créé avec :
    - Nom : "[nom original] (copie)"
    - Mêmes valeurs pour tous les autres champs
  → Modal ouvert directement en mode édition (pour ajuster le nom)
  → Toast "Produit dupliqué ✅"
```

---

## 8. Catégories

### 8.1 Création

```
QUAND l'utilisateur clique "+ Nouvelle catégorie"
ALORS :
  → Input inline (comme un dossier de fichier)
  → Saisit le nom + Enter ou clic ailleurs
  → Catégorie créée, affichée dans la liste
  → Focus automatique sur le champ
```

### 8.2 Renommage

```
QUAND l'utilisateur double-clique sur le nom d'une catégorie
ALORS :
  → Nom devient éditable inline
  → Enter pour valider, Escape pour annuler
```

### 8.3 Suppression

```
QUAND l'utilisateur supprime une catégorie
ALORS :
  → Confirmation : "Supprimer [catégorie] ? Les produits seront déplacés vers 'Sans catégorie'."
  → Produits → categoryId = null
  → Catégorie supprimée
```

### 8.4 Réordonnancement (V2 / stretch)

- Drag & drop des catégories pour changer l'ordre
- Pas prioritaire en v1 → tri alphabétique par défaut

---

## 9. Intégration avec l'Éditeur de Devis

### 9.1 Sélecteur de catalogue dans le devis

```
QUAND l'utilisateur est dans l'éditeur de devis
ET clique sur "+ Depuis catalogue"
ALORS :
  → Panneau/Popover qui affiche le catalogue
  → Recherche + filtre par catégorie
  → Clic sur un produit → ajouté comme nouvelle ligne dans le devis
  → Les champs sont pré-remplis (nom, prix, TVA, unité)
  → L'utilisateur peut modifier les valeurs avant sauvegarde (override)
```

### 9.2 Données copiées (pas de lien)

```
QUAND un produit du catalogue est ajouté à un devis
ALORS la ligne de devis contient :
  - productName (copie du name)
  - unitPrice (copie du prix)
  - vatRate (copie du taux)
  - unit (copie de l'unité)
  - productId (nullable, pour référence/tracking, MAIS pas de contrainte FK)
```

Le `productId` est stocké pour pouvoir proposer des stats ("ce produit est dans 12 devis") mais n'est **jamais** utilisé pour charger des données au runtime.

---

## 10. Import CSV (V2 — stretch goal)

**Format attendu :**
```csv
name,description,unitPrice,vatRate,unit,category
"Site vitrine","Création site responsive",3500,20,forfait,"Développement"
"SEO mensuel","Optimisation SEO continue",500,20,mois,"Marketing"
```

**Comportement :**
- Upload du CSV → preview des lignes
- Validation : nom requis, prix numérique, unité dans liste
- Lignes invalides : signalées en rouge, non importées
- Import des lignes valides → toast avec compte "X produits importés, Y erreurs"

---

## 11. API Design (tRPC)

```typescript
// Router catalogue
catalogueRouter = {
  // Produits
  products: {
    list:      // GET — liste avec filtre catégorie + recherche
    create:    // POST — créer un produit
    update:    // PATCH — modifier un produit
    delete:    // DELETE — supprimer (soft delete optionnel)
    duplicate: // POST — dupliquer un produit
  },
  // Catégories
  categories: {
    list:      // GET — liste toutes les catégories de l'user
    create:    // POST — créer une catégorie
    update:    // PATCH — renommer
    delete:    // DELETE — supprimer (produits → null category)
    reorder:   // PATCH — réordonner (array d'IDs)
  }
}
```

**Tous les endpoints :** nécessitent authentification (middleware Better Auth), isolation par `userId`.

---

## 12. Base de Données (Drizzle Schema)

```typescript
// products
export const products = pgTable("products", {
  id:          uuid("id").defaultRandom().primaryKey(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  unitPrice:   decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  vatRate:     decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  unit:        varchar("unit", { length: 50 }).notNull().default("forfait"),
  categoryId:  uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// productCategories
export const productCategories = pgTable("product_categories", {
  id:        uuid("id").defaultRandom().primaryKey(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:      varchar("name", { length: 100 }).notNull(),
  order:     integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Index
// products: index on (user_id), index on (user_id, category_id)
// productCategories: index on (user_id)
```

---

## 13. Tests Requis

### Unitaires
- Validation prix (négatif, décimales, virgule/point)
- Validation nom (vide, trop long)
- Calcul copie produit → ligne devis

### Intégration (tRPC)
- CRUD produit complet
- CRUD catégorie complet
- Suppression catégorie → produits déplacés
- Filtrage par catégorie
- Recherche textuelle
- Isolation multi-user (user A ne voit pas les produits de user B)

### E2E
- Créer un produit → le voir dans la liste
- Modifier un produit → valeurs mises à jour
- Supprimer un produit → disparaît de la liste
- Créer une catégorie → assigner un produit → filtrer
- Dupliquer un produit → les deux apparaissent

---

## 14. Données de Test (Seed)

```sql
-- Catégories
INSERT INTO product_categories (id, user_id, name, order) VALUES
  ('cat-1', 'test-user', 'Développement', 1),
  ('cat-2', 'test-user', 'SEO & Marketing', 2),
  ('cat-3', 'test-user', 'Maintenance', 3);

-- Produits
INSERT INTO products (user_id, name, description, unit_price, vat_rate, unit, category_id) VALUES
  ('test-user', 'Site vitrine', 'Création site responsive 5 pages', 3500.00, 20, 'forfait', 'cat-1'),
  ('test-user', 'Site e-commerce', 'Boutique en ligne complète', 8000.00, 20, 'forfait', 'cat-1'),
  ('test-user', 'Audit SEO', 'Analyse complète du référencement', 500.00, 20, 'forfait', 'cat-2'),
  ('test-user', 'SEO mensuel', 'Optimisation continue', 500.00, 20, 'mois', 'cat-2'),
  ('test-user', 'Hébergement annuel', 'Hébergement + domaine', 200.00, 20, 'an', 'cat-3');
```

---

## 15. Checklist de Livraison

Avant de marquer "Done" :
- [ ] Schéma DB migré et seedé
- [ ] tRPC routes fonctionnelles (list, create, update, delete, duplicate)
- [ ] Page /catalogue avec affichage par catégorie
- [ ] Formulaire création/édition (modal)
- [ ] Recherche avec debounce
- [ ] Filtre par catégorie
- [ ] Suppression avec confirmation
- [ ] Duplication
- [ ] Catégories : CRUD complet
- [ ] Intégration avec éditeur de devis (sélecteur catalogue)
- [ ] Isolation multi-user testée
- [ ] Edge cases couverts
- [ ] Tests unitaires passent
- [ ] Tests intégration passent
- [ ] Responsive (desktop + tablet)
- [ ] Loading states (skeleton/shimmer)
- [ ] Error states (message + retry)

---

*Simon, ping-moi dès que tu as une question. Même si c'est "Esther, c'est quoi l'unité par défaut ?" — je réponds en direct.* 🎯
