# Migración a monorepo Neutra — Design Spec

- **Fecha:** 2026-11-17
- **Estado:** propuesto (pendiente de revisión del usuario y de `writing-plans`)
- **Alcance:** diseño únicamente. Ninguna decisión de esta sesión modifica código de producción.
- **Modelo de referencia:** `/mnt/c/Users/leonardo/Repositories/role` (bun workspaces + turbo + `packages/commons`).

## 1. Contexto

Los servicios de Neutra viven hoy en repos separados dentro de `/mnt/c/Users/leonardo/Repositories/`:

| Repo | Stack | Estado relevante |
| --- | --- | --- |
| `api-neutra-v2` | Node 22.12+, Express 5, Prisma 7.10.1, class-validator 0.15.1, TypeScript 7.0.2 | 73 suites / 712 tests en verde, `tsc` limpio, **3 commits locales sin pushear** (`ed9dbe0`, `96894cb`, `4dbebd5`). Working tree limpio. |
| `neutra-frontend` | Next.js 16, en migración a TanStack Start (Vite) | Otro agente está ejecutando el cutover. Spec y plan en `docs/superpowers/{specs,plans}/2026-11-16-tanstack-start-rewrite-*`. **No tocar.** |
| `neutra-cms` | Strapi 5.57, npm | Con cambios sin commitear: actualización de dependencias (Strapi 5.52.1 → ^5.57.0, TS 5 → ^7.0.2, `package-lock.json` regenerado). |

El objetivo es un monorepo estilo `role` con contratos compartidos como fuente de verdad, sin cambiar frameworks ni runtimes.

## 2. Decisiones

Las decisiones abajo **revocan** explícitamente preferencias del brief original; se registran aquí para evitar ambigüedad.

| # | Decisión | Origen |
| --- | --- | --- |
| D1 | Zod es la fuente de verdad de los contratos en `packages/commons` | Brief original |
| D2 | Estructura objetivo `apps/api`, `apps/web`, `packages/commons`; `apps/cms` se incorpora también | Brief + decisión de sesión |
| D3 | Sin cambio de framework ni runtime: Express + Node + Prisma se mantienen | Brief original |
| D4 | El front se incorpora **después** del cutover de TanStack; en este alcance solo API + commons + CMS | Brief original |
| D5 | **bun workspaces + turbo** (no npm workspaces) | Decisión de sesión — revoca la preferencia inicial de npm |
| D6 | **CMS dentro del workspace como `apps/cms` desde este alcance** | Decisión de sesión — revoca "por ahora fuera de alcance" |
| D7 | **Reemplazo total de class-validator por Zod en la fase 1** | Decisión de sesión — revoca "proponé una estrategia por fases de convivencia". Se ejecuta con commits incrementales, pero el estado final de la fase 1 no tiene class-validator |
| D8 | **Approach B**: raíz nueva en `neutra/`, historial de API y CMS importado por `git fetch` local | Decisión de sesión |
| D9 | **Push a `origin/main` de `api-neutra-v2` autorizado** | Decisión de sesión — revoca "no hacer push bajo ningún concepto". Se ejecuta en implementación, con verificación previa del remote; **no en esta sesión de diseño** |
| D10 | El test de drift del front queda degradado temporalmente (no roto); se reata en la fase de incorporación del front | Decisión de sesión |

> Nota sobre D9: el push no es necesario para preservar los 3 commits — `git fetch` desde el repo local ya los trae. Se hace porque el usuario lo pidió explícitamente, no como mecanismo de preservación.

## 3. Estructura objetivo

```
neutra/                          # directorio vacío existente; raíz del monorepo
├── apps/
│   ├── api/                     # Express 5 + Node 22 + Prisma 7 (repo api-neutra-v2)
│   ├── cms/                     # Strapi 5 (repo neutra-cms)
│   └── web/                     # NO SE CREA en este alcance; se incorpora tras el cutover
├── packages/
│   └── commons/                 # SSOT de contratos (enums, entities, DTOs, Zod schemas, envelope, errores)
├── docs/                        # documentación del monorepo
├── package.json                 # private, workspaces: apps/* + packages/*, packageManager: bun
├── turbo.json                   # dependsOn ^build; caché de build/typecheck/test
├── bun.lock                     # único lockfile del workspace
└── .github/workflows/CI.yml
```

Nombres de paquetes propuestos, alineados con `role`: root `neutra`, API `neutra-api`, CMS `neutra-cms`, commons `@0xc1x/neutra-commons` (`workspace:*` en los consumidores).

**`apps/web` no se crea**: no tiene consumidor todavía y un workspace vacío sería ruido. La incorporación del front es una fase posterior con su propio spec/plan.

### Grafo de dependencias

```
packages/commons  ◄── apps/api
        ▲
        └── apps/cms   (solo enums, en una fase posterior de CMS)
apps/web           (fase posterior, tras cutover)
```

`commons` no depende de ningún app. La API no es BFF del CMS ni del front en este diseño; el front seguirá teniendo sus propios Server Routes BFF.

## 4. Propiedad de los contratos

| Artefacto | Hoy | Destino | Notas |
| --- | --- | --- | --- |
| Enums de dominio (13) | `core/entities/*.ts` | `packages/commons/src/enums/` | `AppointmentStatus`, `CategoryType`, `CouponType`, `TenantType`, 8 `Loyalty*`, `OrderStatus` (string union) y `WhatsApp*` (string unions). No importan Prisma; solo aliases `@/` intra-entidad a reescribir. |
| Entidades | `core/entities/*.ts` | `packages/commons/src/<domain>/entities/` | Tipos puros. Reescribir los `import("@/core/...")` a rutas relativas del paquete. |
| DTOs de request (20 con class-validator) | `core/application/dtos/requests/**` | `packages/commons/src/<domain>/schemas/` | Pasan a Zod schemas + `z.infer`. Los 3 sin decoradores (`log.request.ts`, `tenant.request.ts`) pasan igual. |
| DTOs de response (24, sin validación) | `core/application/dtos/responses/**` | `packages/commons/src/<domain>/dtos/` | Tipos + schemas Zod opcionales para contratos de test. |
| Envelope | `types/api-response.ts` | `packages/commons/src/_common/schemas/api.schema.ts` | `ResponsePagination`, `ErrorDetail` (`metadata?: unknown`), `StandardResponse<T>` con `meta: { traceId, timestamp }`. **Forma cable exacta, sin derivas.** |
| Catálogo de errores | `types/error-codes.ts` | `packages/commons/src/_common/errors/` | 11 familias (`AUTH_*` … `WHATSAPP_*`), `ErrorCode`, `ErrorCodes`. ~94 códigos. |
| `AppError` | `types/api-response.ts` | Se queda en `apps/api` | Es comportamiento (`extends Error`, `statusCode`, `code`, `details?`), no contrato de cable. |
| `httpStatusFromDomainError`, `getHttpStatusFromErrorCode` | `types/error-codes.ts` | Se quedan en `apps/api` | Lógica de la API. Candidatos a compartir en el futuro si el front los necesita; YAGNI ahora. |
| Copias del front (`src/types/**`, `src/lib/error-messages.ts`) | `neutra-frontend` | Se quedan en el front | El spec de TanStack dice `src/types` se queda y "backend changes fuera de alcance". Se migran en la fase posterior con aprobación de ese spec. |

### Regla de propiedad

`packages/commons` es la única fuente de verdad de los tipos de cable. Un cambio en un enum, código de error o envelope debe romper la compilación de sus consumidores en el mismo comando (`bun run typecheck` en la raíz con turbo). No se versionan contratos intermedios: contrato + consumidores se actualizan en el mismo commit/PR, como en `role`.

## 5. Estrategia de migración por fases

### Fase 0 — Diseño (esta sesión)

Spec + revisión + plan. Sin tocar producción, sin instalar dependencias, sin push.

### Fase 1 — Monorepo funcional (alcance de este spec)

Se ejecuta como una secuencia de commits locales incrementales, todos verificables:

1. **Bootstrap de la raíz:** `package.json` (bun workspaces + turbo), `turbo.json`, `.gitignore`, `AGENTS.md`/`README.md` mínimos. `bun install` genera el `bun.lock` único.
2. **Push autorizado (D9):** verificar `git remote -v` y `git branch`, luego `git push origin main` en `api-neutra-v2` para asegurar los 3 commits. Sin force push.
3. **Importar API (Approach B):** en `neutra/`, `git remote add api ../api-neutra-v2`, `git fetch api`, `git merge --allow-unrelated-histories api/main`, y mover el árbol a `apps/api/`. Los 3 commits quedan en el historial.
4. **`packages/commons`:** crear el paquete (`type: module`, `dist/`, `exports`, `zod` como dependencia), portar enums → entities → envelope/códigos → schemas. Build a `dist/` con `tsc`.
5. **Consumo desde la API:** `"@0xc1x/neutra-commons": "workspace:*"`, importar enums/envelope/códigos desde commons y borrar las copias locales. `bun run typecheck` en verde.
6. **Reemplazo total de validación (D7):** migrar `middleware/validation.middleware.ts` y los 20 DTOs + 16 call sites a Zod; eliminar `class-validator` y `class-transformer` de `apps/api/package.json`. Ver §6.
7. **Guards:** adaptar `check-architecture.ts`, el adapter R1–R11, `verify-production-build.ts` y agregar `check-commons-align.mjs`. Ver §7.
8. **Build / CI / Docker:** parametrizar `tsconfig`, `prisma.config.ts`, `tsconfig.build.json`, Dockerfiles, docker-compose y CI. Ver §8.
9. **Importar CMS:** `git remote add cms ../neutra-cms`, `git fetch cms`, merge con historial no relacionado, mover a `apps/cms/`. El working tree del CMS se importa **tal cual**, incluida la actualización de dependencias en vuelo; no se commitea nada en el repo fuente. Si `apps/cms` no compila con esas versiones, se revierten a las versiones commiteadas dentro del commit de importación y se documenta. Migrar su `package-lock.json` al `bun.lock` del root.
10. **Cierre:** `bun run typecheck && bun run test && bun run build` en la raíz con turbo; todos los checks de §9 en verde.

### Fase 2 — Front (fuera de alcance)

Tras el cutover de TanStack: crear `apps/web`, mover `src/types/**` y `src/lib/error-messages.ts` a commons, reatar el test de drift (D10) y revalidar los gates de paridad byte-a-byte del spec del front. Requiere spec/plan propio.

## 6. Zod vs class-validator

**Estado final de la fase 1: Zod único en la API.** Class-validator y class-transformer desaparecen de `apps/api/package.json` y de todo el código.

### Migración del middleware

`validateDto` / `validateQueryDto` pasan a recibir un `ZodType` y usar `safeParse`:

- `validation.middleware.ts` conserva su nombre y su contrato con las rutas (`req.validatedBody` / `req.validatedQuery`).
- Los issues de Zod se mapean a `ErrorDetail` con `code: ValidationErrorCodes.INVALID_FORMAT`, `message`: primer mensaje del issue, `field`: `issue.path.join(".")`, `domain: "validation"`.
- Se mantiene el status `400` y el mensaje agregador `"Validación fallida"`. **El cable no cambia.**

### Puntos delicados

- **16 query DTOs:** hoy `class-transformer` hace coerción implícita de query strings. Con Zod hay que usar `z.coerce` explícito para números/booleanos/fechas en `appointment.query.ts` y `list-query.dto.ts` (9 schemas). Sin esto, los endpoints filtrarían distinto.
- **`loyalty.request.ts` y `whatsapp.request.ts`:** usan `@Type`/`@Transform`; se traducen a `z.preprocess` / `.transform`.
- **Response DTOs:** no tenían validación; se convierten en tipos inferidos y, donde aporte, schemas de test. No se agrega validación de salida nueva (YAGNI).
- **`composeValidators`:** se reimplementa como composición de schemas (`z.intersection` / `.and`), preservando la semántica de los 3 validadores actuales.

### Cómo no romper los 712 tests

Antes de reescribir el middleware se capturan **golden tests** de las respuestas 400 representativas (por familia de DTO y por los 16 endpoints de query). Cada migración de DTO se hace en su propio commit y se ejecuta la suite completa. El diff entre la respuesta golden y la nueva debe ser vacío. Esto es lo que permite un reemplazo total sin reescritura a ciegas.

## 7. Guards

Ningún guard se debilita para que la migración pase. Si una regla requiere cambio, va en un commit dedicado con justificación.

| Guard | Situación en el monorepo |
| --- | --- |
| `scripts/check-architecture.ts` | Permanece en `apps/api/scripts`. Su `ROOT = __dirname/..` pasa a resolver `apps/api`, que es exactamente la raíz que asumen `PROTECTED_DIRS`, `CORE_DIRS` y los checks de `as any` / Prisma / HTTP-composition. Sin cambios semánticos. |
| Doctor R1–R11 (`scripts/api-doctor/adapters/architecture.adapter.ts`) | Ya parametrizable vía `DoctorContext.rootDir`. El root passa a `apps/api`; los prefijos `core/`, `infrastructure/`, `middleware/` siguen siendo relativos a la app. Reglas: R1 dirección de capas, R2 entidades-tipo, R3 dominio, R4 reglas duplicadas, R5 sin presenters, R6 dinero, R7 sin `require`, R8 sin HTTP status, R9 puestos ignoran DTOs HTTP, R10/R11 middleware delgado. |
| `verify-production-build.ts` | `moduleRoot = apps/api/scripts`; `projectRoot` detecta `apps/api/package.json` y queda en `apps/api`. Sigue verificando `dist/app.js`, Swagger y los paths `/health`, `/ready`. Sin cambios funcionales. |
| `check-commons-align.mjs` (nuevo) | Port de `role`. Verifica que `apps/api` declare `@0xc1x/neutra-commons: workspace:*`, que `dist/index.js` + `dist/index.d.ts` existan, y que la major de `zod` coincida entre commons y la API. Se ejecuta antes de typecheck/test, en local y en CI. |

Scripts root sugeridos: `build`, `typecheck`, `test`, `lint`, `format:check`, `check:arch`, `doctor:api`, `commons:check` — todos vía turbo con `--filter` cuando aplique.

## 8. CI y Docker

### CI (`.github/workflows/CI.yml`)

- Node 22.x y setup de bun en el job raíz; caché de `bun.lock` en lugar de `package-lock.json`.
- `bun install --frozen-lockfile` en la raíz (una sola instalación para los 3 workspaces).
- Prisma: `generate`, `migrate deploy` y `db seed` ejecutados con `bun run --cwd apps/api ...` (o `turbo run --filter=neutra-api`).
- `commons:check` antes de typecheck/test; `turbo run build` garantiza commons → consumidores.
- `check:arch` y `doctor:api` apuntando a `apps/api`.
- Servicios Postgres + Redis y env (`DATABASE_URL`, `SUPER_ADMIN_PASSWORD`) se mantienen.
- El front **no** entra en CI hasta la fase 2.

### Docker

- `Dockerfile.dev` / `Dockerfile.prod` se mueven a `apps/api/`; el build context pasa a ser `apps/api` (o root con `-f apps/api/Dockerfile.prod`). La verificación de producción debe seguir pasando después del cambio.
- `docker-compose.yml`: actualizar los contextos de build de los servicios `api` y `cms`; agregar el servicio CMS con su `Dockerfile` propio.
- Strapi tiene requerimientos de build distintos: se documenta en `apps/cms/README.md` que su build es independiente y no pasa por turbo de la misma forma.

## 9. Criterios de aceptación ("hecho")

- [ ] `bun install --frozen-lockfile` desde cero en la raíz, sin lockfiles secundarios.
- [ ] `bun run typecheck` limpio en todo el workspace.
- [ ] API: **73 suites / 712 tests en verde**.
- [ ] `bun run build` verde; `verify:production-build` verde (`/health`, `/ready`, Swagger).
- [ ] `check:arch` verde; doctor **R1–R11** verde; ninguna regla debilitada.
- [ ] `commons:check` verde: `workspace:*`, `dist/` presente, majors de zod alineados.
- [ ] `packages/commons` compila y publica `dist/index.js` + `dist/index.d.ts`.
- [ ] **0 imports de `class-validator` ni `class-transformer`** en `apps/api` (verificado por grep en CI).
- [ ] `apps/cms` compila (`strapi build`) con las versiones importadas.
- [ ] Los 3 commits originales (`ed9dbe0`, `96894cb`, `4dbebd5`) están presentes en el historial local.
- [ ] Push a `origin/main` de `api-neutra-v2` ejecutado (D9), sin force push.
- [ ] El historial de `neutra-cms` también importado.
- [ ] Ningún archivo de `neutra-frontend` modificado.

**Fuera del DoD (por decisión D10):** el test de drift `src/lib/__tests__/error-codes.test.ts` del front deja de leer `../api-neutra-v2/types/error-codes.ts`. El test **no falla** — detecta que el archivo no existe y omite el check de drift — pero el guard queda ciego hasta la fase 2. Esto se documenta en `apps/web` al incorporar el front y es requisito de cierre de esa fase.

## 10. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Reemplazo total en fase 1 (D7) con 712 tests en juego | Golden tests de respuestas 400 antes de reescribir; migración DTO por DTO con suite completa por commit. |
| Coerción de query strings distinta entre class-transformer y `z.coerce` | Golden tests específicos para los 16 endpoints de query. |
| Guards con raíz asumida | Ejecutar todos antes y después; `DoctorContext.rootDir` y `__dirname/..` apuntan a `apps/api`. No relajar reglas. |
| CMS con dependencias en vuelo | Importar working tree tal cual; si no compila, revertir versiones dentro del commit de importación. No tocar el repo fuente. |
| Test de drift del front ciego (D10) | Documentado, con fix obligatorio en fase 2. No se toca `neutra-frontend`. |
| Push (D9) | Verificar remote y branch antes de ejecutar; sin force; solo `origin/main` de `api-neutra-v2`. |
| Zod transitivo → directo | Declarar `zod` en commons y en la API con la misma major; `commons:check` lo verifica. |
| `apps/web` vacío | No se crea hasta que exista consumidor real. |
| Strapi + bun | Verificar build de `apps/cms` en CI antes de dar por cerrada la fase 1. |

## 11. Fuera de alcance

- Cualquier modificación a `neutra-frontend` o al plan de TanStack Start.
- Cambios de framework/runtime (Nest, Elysia, Node distinto de 22, Prisma distinto de 7).
- Funcionalidad nueva en el CMS o en la API.
- Publicar paquetes a npm; `commons` se consume vía `workspace:*`.
- La fase 2 del front (spec/plan propio).
