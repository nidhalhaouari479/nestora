# Nestora · Storefront (application étudiante)

Application Next.js 16 mobile-first : onboarding (P01 → P04) et découverte des logements (P05A → P13).
Le portail équipe se trouve dans `../backoffice`.

## Démarrage

```bash
cp .env.example .env.local   # puis remplir les valeurs
npm install
npm run dev                  # http://localhost:3000
```

Sans Supabase configuré (ou si la migration n’est pas appliquée), les pages de découverte affichent
les logements de démonstration de `src/features/listings/infrastructure/demo-listings.ts`.

## Base de données (Supabase)

Les migrations sont dans `supabase/migrations`, à appliquer dans l’ordre :

| Fichier | Contenu |
| --- | --- |
| `202610020001_initial_auth_onboarding.sql` | profils étudiants |
| `202610050001_email_password_auth.sql` | profil créé à l’inscription |
| `202610050002_fix_signup_profile_conflict.sql` | correctif du trigger |
| `202610130001_discovery_visits_staff_portal.sql` | universités, logements, favoris, visites, équipe, 2FA, audit, Command Center, RLS |
| `202610140001_student_signup_fields.sql` | inscription complète : téléphone, genre, email unique |

- **Supabase CLI** : `supabase db reset` applique les migrations puis `supabase/seed.sql`.
- **Projet hébergé** : coller chaque migration puis `seed.sql` dans *SQL Editor*, ou `supabase db push`.

`seed.sql` contient des données de démonstration (6 logements, file d’actions, planning). Ne pas l’exécuter en production.

## Code de vérification par email (OTP)

P03 crée le compte (nom, prénom, téléphone, genre, email, mot de passe) ; P03B confirme l’email avec le code à 6 chiffres.
La connexion (`/auth/login`) accepte l’email **ou** le téléphone + mot de passe ; le téléphone est résolu côté serveur
(`SUPABASE_SERVICE_ROLE_KEY` requise).

1. Renseigner les variables `SMTP_*` et `NEXT_PUBLIC_OTP_*` de `.env.local`.
2. Supabase → *Authentication → Emails → SMTP Settings* : recopier les mêmes valeurs SMTP.
3. Supabase → *Authentication → Emails → Templates* : pour **Confirm signup** et **Magic Link**, coller
   `supabase/templates/otp-code.html` (il affiche `{{ .Token }}` au lieu d’un lien).
4. Supabase → *Authentication → Providers → Email* : *Email OTP Length* = `NEXT_PUBLIC_OTP_LENGTH`,
   *Email OTP Expiration* = `NEXT_PUBLIC_OTP_EXPIRY_SECONDS`.

En local avec la CLI, `supabase/config.toml` applique ces réglages automatiquement.

## Parcours

| Écran | Route |
| --- | --- |
| P01 Splash · P02 Welcome | `/` · `/welcome` |
| P03 Création de compte · Connexion · P03B Vérification OTP | `/auth` · `/auth/login` · `/verify` |
| P04 Université | `/onboarding/university` |
| P05A / P05B Accueil | `/explore` |
| P07 Filtres | `/explore/filters` |
| P08 Résultats | `/search` |
| P10A / B / C Détail logement | `/logements/[slug]` |
| P12 Demander une visite · P13 Demande envoyée | `/logements/[slug]/visite` · `/logements/[slug]/visite/envoyee` |

## Vérification

```bash
npm run build && npx next start -p 3005
TEST_BASE_URL=http://localhost:3005 node scripts/verify-onboarding.mjs
```
