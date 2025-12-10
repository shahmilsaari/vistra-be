## Vistra Backend

A NestJS API that manages users, attachments, paths/folders, and audit logs with Prisma + MySQL. This README covers the commands and configuration you need to get the project running locally.

### Prerequisites

- **Node.js 20+** (Match the `.nvmrc`/`package.json` engines if present.)
- **MySQL** 8+/compatible server
- Optional: `npm` (bundled with Node.js) or `corepack`/`pnpm` if you prefer another package manager.

### Getting started

1. **Install runtime dependencies**
   ```bash
   npm install
   ```

2. **Copy the configuration template**
   ```bash
   cp .env.sample .env
   ```
   Then update:
   - `DATABASE_URL` if your MySQL credentials or host differ from `mysql://root@127.0.0.1:3306/vistra`.
   - `JWT_SECRET` to a secure random string (`openssl rand -hex 32` or similar).
   - `FRONTEND_URL` (optional) to enable CORS for your client during development.

#### Required environment variables

| Key | Description | Example |
| --- | ----------- | ------- |
| `PORT` | HTTP port the server listens on | `4000` |
| `NODE_ENV` | App environment | `development` / `production` |
| `STORAGE_BASE_URL` | Base URL used to build attachment URLs | `http://localhost:4000` |
| `DATABASE_URL` | Prisma database connection URL | `mysql://root@127.0.0.1:3306/vistra` |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Optional MySQL overrides if you build the URL manually | `127.0.0.1`, `3306`, `root`, `` , `vistra` |
| `JWT_SECRET` | Secret used to sign JWTs | `change-me-to-a-secure-random-string` |
| `JWT_EXPIRES_IN` | Token expiration duration | `3600s` |
| `FRONTEND_URL` | Origin allowed in CORS | `http://localhost:3000` |

3. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

4. **Apply migrations (creates schema + dev seeds)**
   ```bash
   npm run prisma:migrate
   ```
   If needed, run `npm run prisma:seed` to load additional fixtures defined in `prisma/seed.ts`.

5. **Seed default admin (no frontend registration yet)**
   ```bash
   npm run prisma:seed
   ```
   The seed script checks for `admin@sample.com`, hashes `12345678a`, and creates that admin user with `Role.ADMIN`, along with a “Documents” path. Run this after wiping the database, and change the password via the API once you have access.

### Running the app

- **Development (auto-restarts)**
  ```bash
  npm run start:dev
  ```
  This spins up Nest with hot reloading and logs requests to the console.

- **Production build**
  ```bash
  npm run build
  npm run start:prod
  ```

- **Debugging**
  ```bash
  npm run start:debug
  ```

The HTTP API is prefixed with `/api/v1`. Swagger docs are available at `http://localhost:4000/api/docs` (port comes from `PORT` in `.env`).

### API reference

All routes are rooted at `/api/v1`, guarded by the JWT cookies set by the auth endpoints (`accessToken` is HTTP-only, while `vistra_token` can also be sent in `Authorization: Bearer`). Swagger (`/api/docs`) keeps these definitions in sync; use it as the canonical source if you generate a PDF.

#### Authentication

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | No | `{ email, name, password }` | `{ accessToken, user: { id, email, name, role } }` (sets cookies) |
| POST | `/auth/login` | No | `{ email, password }` | Same shape as register; cookies refreshed |
| POST | `/auth/logout` | Yes | | `{ message: 'Logged out successfully' }` (clears cookies) |
| GET | `/auth/me` | Yes | | `{ id, email, name, role }` |

Create/register defaults to `Role.MEMBER` and fails if the email already exists. Login + logout rely on the cookies, but every protected request can also send `Authorization: Bearer <token>`.

#### Users

- `GET /users/profile` (requires auth) — duplicates `/auth/me` but lives under the `Users` tag for Swagger. Returns the same user summary.

#### Attachments

- `POST /attachments` (auth, `multipart/form-data`) — fields: `files` (max 10 @ 50 MB each), optional numeric `pathId` or safe `folder` name. Returns `AttachmentListItemDto[]` containing owner/creator metadata, `storageUrl`, `mime`, etc.
- `GET /attachments` (auth) — query params from `QueryAttachmentsDto`: `pathId`, `folder`, `search`, `kind`, `page`, `limit`, `sortBy` (`name`, `size`, `createdAt`, `updatedAt`), `sortOrder` (`asc`/`desc`). Response is `PaginatedAttachmentsDto` with `directories`, `data`, and `meta` (`totalCount`, `totalPages`, `page`, `limit`).
- `GET /attachments/directory/:folder` (auth) — folder name must match `/^[^\\/]+$/`; accepts the same query filters (minus `folder`). Returns `DirectoryAttachmentsDto` with paged attachments inside the named path.
- `GET /attachments/:id` (auth) — optional `QueryLogsDto` (`page`, `limit`, `attachmentId`, `action`). Response is `{ attachment, logs }` with both DTOs.
- `PATCH /attachments/:id` (auth) — body can include `name`, numeric `pathId`, or safe `folder`. Cannot send both `pathId` and `folder`; path must belong to the owner. Returns updated `AttachmentListItemDto`.
- `POST /attachments/folders` (auth) — create a folder by name (`{ folder }`). Returns `{ folder, diskPath, pathId }`.
- `DELETE /attachments/directory/:folder` (auth) — deletes a folder (owned by the user), its attachments, remarks, and disk files. Returns `{ folder: '/<name>', deletedFiles }`.
- `DELETE /attachments/:id` (auth) — removes an attachment and disk file; response is the deleted attachment DTO.

Attachments also set `Logs` entries for uploads, updates, and deletes. Uploaded files land under `uploads/<folder>` and are served statically at `/uploads/<filename>`.

#### Paths

- `POST /paths` (auth) — create a new path/folder. Body: `{ name, parentId? }`. Parent must refer to an existing path. Returns the created path record.

#### Remarks

- `POST /remarks` (auth) — payload: `{ attachmentId, title, message }`. Fails if the attachment does not exist. Returns `RemarkItemDto`.
- `GET /remarks/attachment/:attachmentId` (auth) — pagination via `page`/`limit`; returns `PaginatedRemarksDto` filtered by the attachment.

#### Logs

- `GET /logs` (auth) — query params: `page`, `limit`, `attachmentId`, `action`. Returns `PaginatedLogsDto` (each item contains `action`, optional `detail`, optional `attachment` reference, and the user that triggered it). `attachmentId` is also accepted when fetching `/attachments/:id` with logs.

### Database / storage tips

- Uploaded files land in the `uploads/` directory relative to the project root. Make sure the directory exists with `mkdir -p uploads` and the process has write permissions.
- Prisma models live under `prisma/schema.prisma`; regenerate the client after schema changes via `npm run prisma:generate`.
- Use `npm run prisma:studio` to inspect data visually.

### Authentication flow

- Registers/logins happen through `/api/v1/auth`, and successful logins set HTTP-only cookies (`accessToken`, `vistra_token`, `vistra_user`).
- Protecting routes uses `JwtAuthGuard`. Use the shared `CurrentUser` decorator to inject the parsed `JwtPayload`.
- Login failures return `401 Unauthorized` with the message `Email and Password is incorrect`.

### Querying attachments

- Attachments can be listed with `/api/v1/attachments`. Support for `folder`, `pathId`, `kind`, `search`, paging, and sorting is defined in `QueryAttachmentsDto` (`src/modules/attachments/dto/query-attachments.dto.ts`).
- Use `/api/v1/attachments/directory/:folder` to list folder contents, and `/api/v1/attachments/:id` to fetch an attachment with logs.
- Uploads POST to `/api/v1/attachments` with up to 10 files (50 MB per file). Backend logs events via `LogsService`.

### Quality & maintenance

- **Linting**
  ```bash
  npm run lint
  ```

- **Unit tests**
  ```bash
  npm run test
  ```

- **e2e**
  ```bash
  npm run test:e2e
  ```

- **Formatting**
  ```bash
  npm run format
  ```

### Troubleshooting

- **`EPERM 127.0.0.1` during Jest:** Verify no other process blocks the port; run tests after freeing the socket or disable Jest watch mode.
- **Uploads missing:** Ensure `uploads/` exists and Nest has write permission; the controller stores files with Multer’s disk storage.
- **Environment issues:** `npm run start:dev` reads `.env` automatically via `@nestjs/config`. Drop secrets into `.env` and restart the server if you change them.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run prisma:migrate` | Apply Prisma schema migrations |
| `npm run prisma:seed` | Seed sample data (runs via `ts-node`) |
| `npm run start:dev` | Run the server in watch mode |
| `npm run lint` | Auto-fix/validate TypeScript lint issues |
| `npm run test` | Run Jest unit suite |

### Further reading

- `src/modules/attachments` — Attachment logic, query builders, service/repository split.
- `src/common` — Shared decorators, filters, DTOs, and utilities like error normalization.
- `src/modules/auth` & `src/modules/users` — Auth flow and user profile APIs.

Keep the README in sync with any platform-specific deployment docs you add later.
