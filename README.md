# Booky Rebooth CMS (Fase 1)

Custom Node/TypeScript CMS met multi-tenant foundation en Nederlandstalige admin-UI:
**super admin** en **entity admin**.

## Vereisten

- Node.js 20+
- MySQL

## Setup

1. Kopieer env en vul je MySQL connection string + secrets in:

```bash
cp .env.example .env
```

Voorbeeld: `DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/booky_cms"`

2. Installeer dependencies:

```bash
npm install
```

3. Draai migraties:

```bash
npm run db:migrate
```

4. Seed de super admin (en optioneel demo-entity):

```bash
npm run db:seed
```

5. Start API + admin-UI:

```bash
npm run dev
```

- Admin UI: http://localhost:5173
- API: http://localhost:3000/api/health

Na `npm run build` + `npm start` serveert Express de UI op http://localhost:3000.

## Rollen

| Rol | Scope |
|-----|--------|
| `SUPER_ADMIN` | Alle entities en users |
| `ENTITY_ADMIN` | Alleen users/content van eigen `entityId` (content volgt in Fase 2) |

## Admin-UI

- Login
- Overzicht
- Entiteiten (super admin): lijst / aanmaken / bewerken
- Merken (super admin): naam + logo
- Product sets (super admin): naam + producten (foto + naam)
- Locaties (entiteit): naam, afbeelding, adres, maps-link, tel, email, permalink
- Verkopers (entiteit): naam, afbeelding, werkschema (unieke weekdagen + locatie)
- Gebruikers: lijst; aanmaken alleen voor super admin

## API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/login` | public |
| `GET` | `/api/auth/me` | Bearer token |
| `GET` / `POST` | `/api/entities` | `SUPER_ADMIN` |
| `GET` / `PATCH` | `/api/entities/:id` | `SUPER_ADMIN` |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/brands` | `SUPER_ADMIN` |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/product-sets` | `SUPER_ADMIN` |
| `POST` | `/api/media?entity=global` | `SUPER_ADMIN` |

### Media-opslag

Bestanden staan op de server als:

```text
media/{entiteit}/files/{bestandsnaam}
```

- Algemene content (merken / product sets): `media/global/files/`
- Later per entiteit: `media/{entity-slug}/files/`
- Publieke URL: `/media/{entiteit}/files/{bestandsnaam}`
| `GET` | `/api/users` | authenticated (scoped) |
| `POST` | `/api/users` | `SUPER_ADMIN` |

### Login voorbeeld

```bash
curl -s http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

## Scripts

| Script | Doel |
|--------|------|
| `npm run dev` | API + Vite admin parallel |
| `npm run build` / `npm start` | Productie build + start |
| `npm run db:migrate` | Migraties (dev) |
| `npm run db:deploy` | Migraties (prod) |
| `npm run db:seed` | Seed super admin |
| `npm run db:studio` | Prisma Studio |

## Volgende fases

- **Fase 2**: entry types & fields (merk, type afspraak, product sets, locaties, verkopers)
- **Fase 3**: beveiligde publieke API voor de externe frontend
