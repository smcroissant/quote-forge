/**
 * Seed script — CroissantDevis
 *
 * Peuple la DB avec des données de test pour démo.
 *
 * Usage :
 *   npm run db:seed
 *
 * Nécessite DATABASE_URL dans .env
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const {
  organizations,
  users,
  accounts,
  sessions,
  organizationMembers,
  productCategories,
  products,
  clients,
  quotes,
  quoteLines,
} = schema;

// ── Setup DB connection ──────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Starting seed...");

  // ── 1. Organization ────────────────────────────────
  console.log("📁 Creating organization...");
  const [org] = await db
    .insert(organizations)
    .values({
      name: "CroissantLabs",
      slug: "croissantlabs",
      email: "contact@croissantlabs.fr",
      phone: "+33 1 23 45 67 89",
      address: "42 rue du Croissant",
      website: "https://croissantlabs.fr",
    })
    .returning();

  // ── 2. Test user ───────────────────────────────────
  console.log("👤 Creating test user...");
  const testUserId = "seed-user-001";
  await db.insert(users).values({
    id: testUserId,
    email: "simon@croissantlabs.fr",
    name: "Simon Dev",
    emailVerified: true,
  });

  await db.insert(accounts).values({
    id: "seed-account-001",
    userId: testUserId,
    accountId: testUserId,
    providerId: "credential",
    password: "$2a$10$dummyhashedpassword", // bcrypt hash de "password123"
  });

  const [session] = await db.insert(sessions).values({
    id: "seed-session-001",
    userId: testUserId,
    token: "seed-session-token-001",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
  }).returning();

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: testUserId,
    role: "owner",
  });

  // ── 3. Product Categories ──────────────────────────
  console.log("📂 Creating categories...");
  const [catDev] = await db.insert(productCategories).values({
    organizationId: org.id,
    name: "Développement",
    sortOrder: 1,
  }).returning();

  const [catDesign] = await db.insert(productCategories).values({
    organizationId: org.id,
    name: "Design",
    sortOrder: 2,
  }).returning();

  const [catMarketing] = await db.insert(productCategories).values({
    organizationId: org.id,
    name: "SEO & Marketing",
    sortOrder: 3,
  }).returning();

  const [catMaintenance] = await db.insert(productCategories).values({
    organizationId: org.id,
    name: "Maintenance",
    sortOrder: 4,
  }).returning();

  // ── 4. Products ────────────────────────────────────
  console.log("📦 Creating products...");
  const seedProducts = [
    // Développement
    {
      organizationId: org.id,
      categoryId: catDev.id,
      name: "Site vitrine",
      description: "Création d'un site vitrine responsive (5 pages max)",
      unitPrice: "3500.00",
      unit: "forfait",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catDev.id,
      name: "Site e-commerce",
      description: "Boutique en ligne complète avec paiement Stripe",
      unitPrice: "8000.00",
      unit: "forfait",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catDev.id,
      name: "Application web sur mesure",
      description: "Développement d'application web complexe (React/Next.js)",
      unitPrice: "850.00",
      unit: "jour",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catDev.id,
      name: "Intégration API",
      description: "Connexion et synchronisation avec API tierce",
      unitPrice: "650.00",
      unit: "jour",
      taxRate: "20.00",
      isActive: true,
    },
    // Design
    {
      organizationId: org.id,
      categoryId: catDesign.id,
      name: "Identité visuelle",
      description: "Logo + charte graphique complète",
      unitPrice: "2500.00",
      unit: "forfait",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catDesign.id,
      name: "Design UI/UX",
      description: "Maquettes Figma pour application web ou mobile",
      unitPrice: "600.00",
      unit: "jour",
      taxRate: "20.00",
      isActive: true,
    },
    // Marketing
    {
      organizationId: org.id,
      categoryId: catMarketing.id,
      name: "Audit SEO",
      description: "Analyse complète du référencement + recommandations",
      unitPrice: "500.00",
      unit: "forfait",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catMarketing.id,
      name: "SEO mensuel",
      description: "Optimisation continue du référencement",
      unitPrice: "500.00",
      unit: "mois",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catMarketing.id,
      name: "Campagne Google Ads",
      description: "Création et gestion de campagne publicitaire",
      unitPrice: "300.00",
      unit: "mois",
      taxRate: "20.00",
      isActive: true,
    },
    // Maintenance
    {
      organizationId: org.id,
      categoryId: catMaintenance.id,
      name: "Hébergement annuel",
      description: "Hébergement + nom domaine + certificat SSL",
      unitPrice: "200.00",
      unit: "an",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catMaintenance.id,
      name: "Maintenance mensuelle",
      description: "Mises à jour sécurité + sauvegardes + monitoring",
      unitPrice: "150.00",
      unit: "mois",
      taxRate: "20.00",
      isActive: true,
    },
    {
      organizationId: org.id,
      categoryId: catMaintenance.id,
      name: "Support technique",
      description: "Assistance par email/phone, réponse sous 24h",
      unitPrice: "75.00",
      unit: "heure",
      taxRate: "20.00",
      isActive: true,
    },
    // Inactive (pour tester le filtre)
    {
      organizationId: org.id,
      categoryId: catDev.id,
      name: "Site WordPress",
      description: "Service déprécié — migré vers Next.js",
      unitPrice: "2000.00",
      unit: "forfait",
      taxRate: "20.00",
      isActive: false,
    },
  ];

  const createdProducts = await db.insert(products).values(seedProducts).returning();
  console.log(`   → ${createdProducts.length} produits créés`);

  // ── 5. Clients ─────────────────────────────────────
  console.log("👥 Creating clients...");
  const seedClients = [
    {
      organizationId: org.id,
      name: "Boulangerie Martin",
      email: "contact@boulangerie-martin.fr",
      phone: "01 42 33 44 55",
      address: "15 rue des Lilas",
      city: "Paris",
      postalCode: "75011",
      country: "FR",
      notes: "Client fidèle depuis 2023. Préfère les devis détaillés.",
    },
    {
      organizationId: org.id,
      name: "TechStart SAS",
      email: "hello@techstart.io",
      phone: "06 78 90 12 34",
      address: "88 avenue des Champs-Élysées",
      city: "Paris",
      postalCode: "75008",
      country: "FR",
      notes: "Startup Série A — budget marketing important",
    },
    {
      organizationId: org.id,
      name: "Cabinet Dubois & Associés",
      email: "j.dubois@dubois-avocats.fr",
      phone: "01 56 78 90 12",
      address: "3 place de la Bourse",
      city: "Lyon",
      postalCode: "69002",
      country: "FR",
      notes: "Cabinet d'avocats — site vitrine + SEO",
    },
    {
      organizationId: org.id,
      name: "Restaurant Le Gourmet",
      email: null,
      phone: "04 91 23 45 67",
      address: "27 cours Mirabeau",
      city: "Aix-en-Provence",
      postalCode: "13100",
      country: "FR",
      notes: "Site + réservation en ligne — pas d'email, contact par téléphone",
    },
    {
      organizationId: org.id,
      name: "GreenTech Énergie",
      email: "projet@greentech-energie.com",
      phone: "05 61 00 11 22",
      address: "5 impasse de l'Innovation",
      city: "Toulouse",
      postalCode: "31000",
      country: "FR",
      notes: "Application web de monitoring énergétique — projet en cours",
    },
    {
      organizationId: org.id,
      name: "École Montessori Les Petits Princes",
      email: "direction@petitsprinces.fr",
      phone: "02 40 11 22 33",
      address: "12 rue de la Paix",
      city: "Nantes",
      postalCode: "44000",
      country: "FR",
      notes: "Site école + espace parent — paiement en 3 fois",
    },
  ];

  const createdClients = await db.insert(clients).values(seedClients).returning();
  console.log(`   → ${createdClients.length} clients créés`);

  // ── 6. Devis exemples ──────────────────────────────
  console.log("📄 Creating sample quotes...");
  const siteVitrine = createdProducts.find((p) => p.name === "Site vitrine")!;
  const auditSEO = createdProducts.find((p) => p.name === "Audit SEO")!;
  const hebergement = createdProducts.find((p) => p.name === "Hébergement annuel")!;
  const maintenance = createdProducts.find((p) => p.name === "Maintenance mensuelle")!;

  const boulangerie = createdClients.find((c) => c.name === "Boulangerie Martin")!;
  const techStart = createdClients.find((c) => c.name === "TechStart SAS")!;

  // Devis 1 — Accepté
  const [quote1] = await db.insert(quotes).values({
    organizationId: org.id,
    clientId: boulangerie.id,
    quoteNumber: "DEV-2026-001",
    status: "accepted",
    title: "Site vitrine + hébergement",
    notes: "Client satisfait, paiement reçu.",
    subtotal: "3700.00",
    taxAmount: "740.00",
    total: "4440.00",
    acceptedAt: new Date("2026-02-15"),
  }).returning();

  await db.insert(quoteLines).values([
    {
      quoteId: quote1.id,
      productId: siteVitrine.id,
      description: "Site vitrine responsive (5 pages)",
      quantity: "1",
      unitPrice: "3500.00",
      taxRate: "20.00",
      lineTotal: "3500.00",
      sortOrder: 1,
    },
    {
      quoteId: quote1.id,
      productId: hebergement.id,
      description: "Hébergement annuel + domaine",
      quantity: "1",
      unitPrice: "200.00",
      taxRate: "20.00",
      lineTotal: "200.00",
      sortOrder: 2,
    },
  ]);

  // Devis 2 — En attente
  const [quote2] = await db.insert(quotes).values({
    organizationId: org.id,
    clientId: techStart.id,
    quoteNumber: "DEV-2026-002",
    status: "sent",
    title: "Audit SEO + maintenance mensuelle",
    notes: "Envoyé le 10 mars — relance prévue le 20 mars.",
    subtotal: "2000.00",
    taxAmount: "400.00",
    total: "2400.00",
    validUntil: new Date("2026-04-10"),
    sentAt: new Date("2026-03-10"),
  }).returning();

  await db.insert(quoteLines).values([
    {
      quoteId: quote2.id,
      productId: auditSEO.id,
      description: "Audit SEO complet",
      quantity: "1",
      unitPrice: "500.00",
      taxRate: "20.00",
      lineTotal: "500.00",
      sortOrder: 1,
    },
    {
      quoteId: quote2.id,
      productId: maintenance.id,
      description: "Maintenance mensuelle (engagement 12 mois)",
      quantity: "12",
      unitPrice: "150.00",
      taxRate: "20.00",
      lineTotal: "1800.00",
      sortOrder: 2,
    },
  ]);

  // Devis 3 — Brouillon
  const [quote3] = await db.insert(quotes).values({
    organizationId: org.id,
    clientId: boulangerie.id,
    quoteNumber: "DEV-2026-003",
    status: "draft",
    title: "SEO mensuel — nouveau contrat",
    notes: "À finaliser après accord client sur la durée.",
    subtotal: "0",
    taxAmount: "0",
    total: "0",
  }).returning();

  console.log(`   → 3 devis créés (1 accepté, 1 envoyé, 1 brouillon)`);

  // ── Résumé ─────────────────────────────────────────
  console.log(`
✅ Seed terminé !

📊 Données créées :
   • 1 organization (CroissantLabs)
   • 1 utilisateur (simon@croissantlabs.fr / password123)
   • 4 catégories (Développement, Design, SEO & Marketing, Maintenance)
   • 13 produits (12 actifs + 1 inactif)
   • 6 clients
   • 3 devis (accepté, envoyé, brouillon)
   • 5 lignes de devis

🔑 Login test :
   Email    : simon@croissantlabs.fr
   Password : password123
   Org      : CroissantLabs

🚀 Lancez \`npm run dev\` et connectez-vous !
  `);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
