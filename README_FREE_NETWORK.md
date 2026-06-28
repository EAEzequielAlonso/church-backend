# Public Backend Readiness (FREE_NETWORK)

## Endpoints listos
- `GET /public/churches`
- `GET /public/churches/:slug`
- `POST /public/churches/claim` (JWT)
- `GET /public/relations/my` (JWT)
- `POST /public/relations` (JWT)
- `DELETE /public/relations/:id` (JWT)
- `GET /public/geo/need-heatmap`
- `GET /public/admin/my-churches` (JWT)
- `GET /public/admin/dashboard/:churchId` (JWT)
- `GET /public/admin/relations/pending` (JWT)
- `POST /public/admin/relations/:id/approve` (JWT)
- `POST /public/admin/relations/:id/reject` (JWT)
- `PATCH /public/admin/church-profile/:churchId` (JWT)
- `GET /admin/public/claims/pending` (JWT admin operativo)
- `POST /admin/public/claims/:id/approve` (JWT admin operativo)
- `POST /admin/public/claims/:id/reject` (JWT admin operativo)

## Flujo de claim approval
1. Usuario crea claim en `POST /public/churches/claim`.
2. Admin lista pendientes en `GET /admin/public/claims/pending`.
3. Admin aprueba en `POST /admin/public/claims/:id/approve`.
4. El backend marca claim `APPROVED` y actualiza `church_public_profiles`: `isClaimed=true`, `claimedByUserId=<claimant>`, `isVerified=true`.
5. Si rechaza: estado `REJECTED` y `verificationNotes` opcionales.

## Incluye FREE_NETWORK
- Perfil publico de iglesia
- Relaciones publicas (follower, visitor/member pending, looking for church)
- Moderacion basica de relaciones
- Dashboard basico de iglesia reclamada

## No incluye FREE_NETWORK
- Tesoreria
- Inventario
- Ministerios avanzados
- ERP completo
- ChurchPerson flow profundo

## Recomendacion frontend
1. Directory + profile como capa publica inicial.
2. Login y claim.
3. Panel `my-churches`.
4. Dashboard por iglesia reclamada.
5. Moderacion de relaciones pending.
