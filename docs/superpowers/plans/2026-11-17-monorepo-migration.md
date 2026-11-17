# Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir `api-neutra-v2` en la raíz de un monorepo bun con `apps/api`, `apps/cms` y `@neutra/commons` como fuente de verdad de los contratos, eliminando class-validator de la API sin romper los 712 tests.

**Architecture:** Approach B del spec: `git init` en `neutra/`, importar los historiales de API y CMS con `git fetch` local + merge de historiales no relacionados, mover los árboles a `apps/api` y `apps/cms`, y crear `@neutra/commons` con Zod. La fase 1 es un corte integrado porque contrato y consumidores deben cambiar juntos; la incorporación del front es la fase 2 y tiene plan propio.

**Tech Stack:** bun workspaces + turbo · Node >=22.12.0 · TypeScript 7.0.2 · Express 5 · Prisma 7.10.1 · Zod 4 · Jest · Strapi 5.57

**Spec:** `docs/superpowers/specs/2026-11-17-monorepo-migration-design.md`

## Global Constraints

- Node `>=22.12.0`; Express 5; Prisma `7.10.1`; TypeScript `7.0.2`. Sin cambio de framework ni runtime (D3).
- Package manager **bun** con workspaces `apps/*` y `packages/*` + turbo (D5). Un único `bun.lock`.
- Nombres: root `neutra`, API `api`, CMS `cms`, commons `@neutra/commons`. **Sin prefijo `0xc1x`** (D11).
- Los consumidores declaran `"@neutra/commons": "workspace:*"`.
- `@neutra/commons` es la única fuente de verdad de enums, envelope, catálogo de errores y DTOs (D1, D12).
- `@neutra/commons` debe ser isomórfico: **0 imports de `node:*`, Prisma o Express**.
- Envelope cable exacto: `ResponsePagination {total,page,limit,totalPages}`, `ErrorDetail {code,message,field?,domain?,metadata?: unknown}`, `StandardResponse<T> {success,statusCode,message,data?,errors?,pagination?,meta:{traceId,timestamp}}`.
- El catálogo de errores tiene 11 familias y ~94 códigos; `AppError` y los resolvers de status HTTP **se quedan en `apps/api`**.
- **0 imports de `class-validator` ni `class-transformer`** al final de la fase 1 (D7).
- API: **73 suites / 712 tests** en verde; `tsc` limpio; `check:arch` y doctor **R1–R11** en verde; ninguna regla debilitada.
- Push permitido **solo** a `origin/main` de `api-neutra-v2` (`https://github.com/LEMNXCIX/api-neutra-v2.git`), sin `--force` (D9).
- **No modificar ningún archivo de `neutra-frontend`**. `apps/web` no se crea en esta fase.
- Los commits `ed9dbe0`, `96894cb`, `4dbebd5` (y los del spec `b0ee708`, `fcd2539`) deben quedar en el historial.
- El working tree no commiteado de `neutra-cms` (actualización de dependencias) se importa tal cual.

## Review Focus

- **Coerción de query strings:** los 16 endpoints de query reciben strings de URL; hoy `class-transformer` convierte implícitamente. Sin `z.coerce` explícito los filtros cambiarían de comportamiento sin fallar tests. → pin: golden tests de los 16 endpoints en Task 6; assertions de coerción en Task 5 y Task 8.
- **Aliases `@/` en entidades portadas:** `tenant.entity.ts:19` contiene `import("@/core/domain/booking/working-hours")`; al copiar a commons deja de resolver. → pin: test de "0 imports `@/`" en Task 3.
- **Deriva del envelope:** el front tiene dos envelopes propios con `metadata?: Record<string, unknown>` y `meta` con index signature; commons debe usar `metadata?: unknown` y `meta` exacto. → pin: test de parseo y tipos en Task 4.
- **Raíz asumida por los guards:** R1–R11 y `check-architecture.ts` usan prefijos `core/`, `infrastructure/`, `middleware/` relativos a la raíz; tras el move deben apuntar a `apps/api`. → pin: test de guards en Task 9.
- **CMS en vuelo:** `package.json`/lockfile del CMS tienen una actualización de Strapi 5.52→5.57 y TS 5→7 sin commitear; Strapi bajo bun puede no compilar. → pin: verificación de build e historial en Task 11.

---

### Task 1: Asegurar los commits de la API en `origin/main` (D9)

**Files:** ninguno (acción externa sobre `api-neutra-v2`).

**Interfaces:**
- Consumes: estado actual del repo (`origin/main` en `0cbaf26`, local en `fcd2539`, 5 commits ahead).
- Produces: `origin/main` apuntando al mismo SHA que local.

- [ ] **Step 1: Verificar remote, branch y commits**

```bash
git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 remote get-url origin
git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 rev-parse --abbrev-ref HEAD
git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 rev-list --count origin/main..main
```

Expected: `https://github.com/LEMNXCIX/api-neutra-v2.git`, `main`, `5`. Si el remote o la ruta no coinciden, detenerse y preguntar antes de continuar.

- [ ] **Step 2: Hacer el push sin force**

```bash
git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 push origin main
```

Expected: `main -> main`, sin `+` ni `forced update`.

- [ ] **Step 3: Verificar el push**

```bash
LOCAL=$(git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 rev-parse HEAD)
REMOTE=$(git -C /mnt/c/Users/leonardo/Repositories/api-neutra-v2 ls-remote origin refs/heads/main | cut -f1)
test "$LOCAL" = "$REMOTE" && echo "push ok"
```

Expected: `push ok`. No hay commit: es una acción externa, no un cambio de archivos.

---

### Task 2: Bootstrap del root e importación del historial de la API (Approach B)

**Files:**
- Create: `neutra/package.json`, `neutra/turbo.json`, `neutra/.gitignore`, `neutra/README.md`, `neutra/scripts/verify-layout.mjs`
- Move: todo el contenido de `api-neutra-v2/` (excepto `.git/`) a `neutra/apps/api/`

**Interfaces:**
- Consumes: repo local `api-neutra-v2` (Task 1).
- Produces: root del workspace con `apps/api/*` y `git log` con los 5 commits importados. Los tasks siguientes asumen esta ruta.

- [ ] **Step 1: Escribir el test de layout (falla)**

Create `neutra/scripts/verify-layout.mjs`: lee `package.json` del root y aserta `name === "neutra"`, `workspaces` contiene `apps/*` y `packages/*`, `packageManager` empieza con `bun@`; aserta que existen `apps/api/package.json`, `apps/api/app.ts`, `apps/api/tsconfig.json`; y que `git log --format=%H` contiene los SHAs `ed9dbe0`, `96894cb`, `4dbebd5`, `b0ee708`, `fcd2539` (comparar por prefijo).

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node scripts/verify-layout.mjs` (en `neutra/`)
Expected: FAIL con "no such file or package.json".

- [ ] **Step 3: Crear el root e importar la API**

```bash
mkdir -p /mnt/c/Users/leonardo/Repositories/neutra
cd /mnt/c/Users/leonardo/Repositories/neutra
git init -b main
git remote add api ../api-neutra-v2
git fetch api
git merge --allow-unrelated-histories api/main
mkdir apps/api
# mover cada entrada top-level excepto .git a apps/api/
git ls-files -z | while IFS= read -r -d '' f; do
  case "$f" in
    .git*) continue ;;
    *) git mv "$f" "apps/api/$f" ;;
  esac
done
```

Nota: mover también los archivos trackeados bajo `.github/` a `apps/api/.github/`; Task 10 los sube a la raíz. Los archivos ignorados (`node_modules`, `dist`, `.env`) no son trackeados: se regeneran con `bun install`/`build` en los tasks correspondientes.

- [ ] **Step 4: Escribir la configuración del root**

`neutra/package.json`: `{"name":"neutra","private":true,"packageManager":"bun@1.4.4","workspaces":["apps/*","packages/*"]}` más scripts `build`, `typecheck`, `test`, `lint`, `format:check`, `check:arch`, `doctor:api`, `commons:check` delegando en turbo/bun (los tasks 9 y 10 los completan).
`neutra/turbo.json`: tasks `build` (`dependsOn: ["^build"]`, outputs `dist/**`), `typecheck` (`dependsOn: ["^build"]`), `test`, `lint`, `format:check`.
`neutra/.gitignore`: `node_modules`, `dist`, `.turbo`, `.env`, `.jest-cache`, `.output`.
`neutra/README.md`: mapa de `apps/api`, `apps/cms`, `packages/commons` y comandos root.

- [ ] **Step 5: Instalar y verificar**

```bash
bun install
node scripts/verify-layout.mjs
```

Expected: `bun.lock` creado; verify-layout pasa. En el mismo paso, guardar la línea base del front (debe estar limpio): `git -C ../neutra-frontend status --porcelain > scripts/.frontend-baseline.txt`. Task 12 la compara al final.

Si el `postinstall` de Prisma falla por la nueva ruta, ajustar `apps/api/package.json` para que `prisma generate` use `apps/api/prisma.config.ts` con cwd `apps/api` (los paths de `prisma.config.ts` ya son relativos y no cambian).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: bootstrap monorepo root and import API history"
```

---

### Task 3: `@neutra/commons` — scaffold, enums y entidades

**Files:**
- Create: `packages/commons/package.json`, `packages/commons/tsconfig.json`, `packages/commons/src/index.ts`, `packages/commons/src/enums/**`, `packages/commons/src/<domain>/entities/**`, `packages/commons/src/__tests__/enums.test.ts`, `packages/commons/src/__tests__/entities-isomorphic.test.ts`
- Source: `apps/api/core/entities/*.ts`

**Interfaces:**
- Consumes: enums y entidades de `apps/api/core/entities/`.
- Produces: para cada enum/unión `<Name>`: `<Name>Schema` (Zod), `<Name>` (const de valores, `<Name>Schema.enum`) y `type <Name>` (`z.infer`). Exportados desde `packages/commons/src/index.ts`.

- [ ] **Step 1: Escribir tests que fallan**

`enums.test.ts`: importar de `../index` y asertar: `AppointmentStatusSchema.options` tiene 7 valores; `CategoryType` = `PRODUCT`/`SERVICE`; `CouponType` = `PERCENT`/`FIXED`; `TenantType` = `STORE`/`BOOKING`/`HYBRID`; `OrderStatusSchema` acepta `PENDIENTE|PAGADO|ENVIADO|ENTREGADO` y rechaza otro; los 8 `Loyalty*` y los 3 `WhatsApp*` existen; `AppointmentStatus.PENDING` es accesible como valor (compatibilidad con la API actual).

`entities-isomorphic.test.ts`: leer recursive `packages/commons/src/**/*.ts` y asertar que ningún archivo contiene `from "node:`, `@prisma/client`, `from "express"`, ni `from "@/`.

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `bun test packages/commons/src/__tests__`
Expected: FAIL con "Cannot find module '../index'".

- [ ] **Step 3: Crear el paquete y portar enums/entidades**

`package.json`: `name: "@neutra/commons"`, `version: "1.0.0"`, `private: true`, `type: "module"`, `sideEffects: false`, `main/types/exports` → `./dist/index.js` / `./dist/index.d.ts`, `dependencies: { "zod": "^4.5.4" }`, scripts `build` (tsc), `typecheck`, `test` (`bun test src`).
`tsconfig.json`: copiar la configuración de `role/packages/commons/tsconfig.json` (ES2022, bundler, `rootDir: ./src`, `outDir: ./dist`, declaration + declarationMap + sourceMap, strict, `noUncheckedIndexedAccess`).
Portar los 13 enums y las entidades de `apps/api/core/entities/`; reescribir `import("@/core/domain/booking/working-hours")` a su ruta relativa dentro de commons. Crear `src/enums/index.ts` y el barrel `src/index.ts`.

- [ ] **Step 4: Ejecutar tests y build**

```bash
bun test packages/commons/src/__tests__
bun run --cwd packages/commons build
```

Expected: tests PASS; existen `packages/commons/dist/index.js` y `dist/index.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/commons && git commit -m "feat(commons): add enums and entities as Zod SSOT"
```

---

### Task 4: `@neutra/commons` — envelope y catálogo de errores (D12)

**Files:**
- Create: `packages/commons/src/_common/schemas/api.schema.ts`, `packages/commons/src/_common/errors/error-codes.ts`, `packages/commons/src/_common/index.ts`, `packages/commons/src/__tests__/api-envelope.test.ts`, `packages/commons/src/__tests__/error-codes.test.ts`
- Source: `apps/api/types/api-response.ts`, `apps/api/types/error-codes.ts`

**Interfaces:**
- Consumes: Task 3 (barrel de commons).
- Produces: `responsePaginationSchema`, `errorDetailSchema`, `standardResponseSchema` (genérico vía `.pipe`/factory si Zod 4 lo requiere), `ApiResponse` helpers de construcción, `ErrorCodes`, `ErrorCode`, y los 11 enums de familia. **`AppError` y los resolvers de status NO se exportan desde commons.**

- [ ] **Step 1: Escribir tests que fallan**

`api-envelope.test.ts`: `standardResponseSchema.safeParse` acepta un fixture con `meta: { traceId: "uuid", timestamp: "ISO" }` y `errors: [{code,message,metadata: {nested: 1}}]`; asertar que `errorDetailSchema.parse({code,message,metadata: 42})` conserva `metadata === 42` (prueba de `unknown`, no `Record`); asertar que falta `meta` → `success === false`.

`error-codes.test.ts`: asertar presencia de las 11 familias `AUTH_`, `VALIDATION_`, `RESOURCE_`, `TENANT_`, `BUSINESS_`, `LOYALTY_`, `DB_`, `EXTERNAL_`, `SYSTEM_`, `RATE_LIMIT_`, `WHATSAPP_`; y que el total de códigos en `ErrorCodes` es >= 90.

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `bun test packages/commons/src/__tests__`
Expected: FAIL con "Cannot find module '../_common'".

- [ ] **Step 3: Portar envelope y errores**

Copiar las formas de `apps/api/types/api-response.ts` y `apps/api/types/error-codes.ts` a Zod, conservando `metadata?: unknown` y `meta` exacto. No portar `AppError` ni `httpStatusFromDomainError`/`getHttpStatusFromErrorCode`. Exportar desde `_common/index.ts` y desde el barrel root.

- [ ] **Step 4: Ejecutar tests**

Run: `bun test packages/commons/src/__tests__`
Expected: PASS. Repetir el test de isomorfismo de Task 3 (sigue pasando).

- [ ] **Step 5: Commit**

```bash
git add packages/commons && git commit -m "feat(commons): share response envelope and error catalog"
```

---

### Task 5: `@neutra/commons` — schemas Zod de DTOs

**Files:**
- Create: `packages/commons/src/<domain>/schemas/*.ts`, `packages/commons/src/<domain>/dtos/*.ts`, índices por dominio, `packages/commons/src/__tests__/dto-schemas.test.ts`
- Source: `apps/api/core/application/dtos/requests/**` (20 con class-validator) y `responses/**` (24)

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces: por cada DTO, un schema `<DtoClass>Schema` y un tipo inferido con el nombre original del DTO. Los schemas de query de `list-query.dto.ts` aceptan valores textuales de URL y devuelven números/booleanos.

- [ ] **Step 1: Escribir tests que fallan**

`dto-schemas.test.ts`: (a) contar los exports de schema de request = 20 y los tipos de response = 24; (b) para un schema de query representativo de `list-query.dto.ts`, `parse({ page: "2", limit: "10" })` devuelve `{ page: 2, limit: 10 }`; (c) un schema con flag booleano parsea `"true"` → `true` y `"false"` → `false`; (d) los equivalentes de `@Type`/`@Transform` de `loyalty.request.ts` y `whatsapp.request.ts` transforman fechas/nested según el original. Los nombres exactos de los schemas se leen de los archivos fuente; la regla de nombre es la de Interfaces.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `bun test packages/commons/src/__tests__/dto-schemas.test.ts`
Expected: FAIL con "Cannot find module".

- [ ] **Step 3: Portar los 44 DTOs**

Para cada `*.request.ts`/`*.query.ts`/`*.dto.ts`: traducir decoradores a Zod (`@IsString`→`z.string()`, `@IsInt`→`z.coerce.number().int()`, `@IsBoolean`→ boolean con `z.coerce`, `@IsEnum`→ el schema de enum de Task 3, `@ValidateNested`/`@Type`→ `z.preprocess`/`transform`, `@Transform`→ `.transform`). Para responses: tipos inferidos desde schemas que reflejen la forma actual. Actualizar barrels de dominio y root.

- [ ] **Step 4: Ejecutar tests**

Run: `bun test packages/commons/src/__tests__` y `bun run --cwd packages/commons build`
Expected: PASS; `dist/index.d.ts` exporta los nuevos tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/commons && git commit -m "feat(commons): port request and response DTOs to Zod"
```

---

### Task 6: Golden tests de validación (antes de reescribir el middleware)

**Files:**
- Create: `apps/api/scripts/record-validation-golden.ts`, `apps/api/test/golden/validation.snapshot.json`, `apps/api/test/validation-golden.test.ts`

**Interfaces:**
- Consumes: middleware actual de class-validator y los 16 endpoints de query.
- Produces: snapshot canónico de respuestas `{status, errors}` que Task 8 debe reproducir exactamente.

- [ ] **Step 1: Escribir el test (falla por snapshot ausente)**

`validation-golden.test.ts`: con `supertest` contra la app, recorrer un caso inválido por familia de DTO (los 20 `*.request.ts`) y los 16 call sites de `validateQueryDto` listados en el spec (appointment 3, category, coupon, log 2, order 4, permission, role, service, slide, staff). Para cada caso, asertar que `response.status === 400` y que `response.body.errors` es deep-equal a la entrada correspondiente de `validation.snapshot.json`.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `bun run --cwd apps/api test:unit -- validation-golden`
Expected: FAIL con "ENOENT ... validation.snapshot.json".

- [ ] **Step 3: Grabar el snapshot con el middleware actual**

`record-validation-golden.ts`: misma matriz de requests, escribe `apps/api/test/golden/validation.snapshot.json` con `{status, errors}` por caso. Ejecutarlo una vez contra el código sin modificar:

```bash
bun run --cwd apps/api scripts/record-validation-golden.ts
```

Expected: archivo creado con una entrada por cada caso de la matriz —como mínimo los 16 de query y uno por cada familia de DTO con decoradores—. Revisar que no contenga stack traces ni fechas.

- [ ] **Step 4: Ejecutar el test**

Run: `bun run --cwd apps/api test:unit -- validation-golden`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/scripts/record-validation-golden.ts apps/api/test/golden apps/api/test/validation-golden.test.ts
git commit -m "test(api): capture validation golden responses before Zod migration"
```

---

### Task 7: La API consume `@neutra/commons` y borra sus copias

**Files:**
- Modify: `apps/api/package.json`, imports en `apps/api/core/`, `apps/api/middleware/`, `apps/api/infrastructure/routes/`
- Create: `apps/api/types/app-error.ts`, `apps/api/types/error-status.ts`, `apps/api/test/commons-adoption.test.ts`
- Delete: definiciones duplicadas en `apps/api/core/entities/*.ts`, `apps/api/types/api-response.ts`, `apps/api/types/error-codes.ts` (salvo `AppError`/resolvers, que se mueven)

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces: `AppError` en `apps/api/types/app-error.ts`; `httpStatusFromDomainError`/`getHttpStatusFromErrorCode` en `apps/api/types/error-status.ts`. Misma firma y semántica que antes.

- [ ] **Step 1: Escribir test que falla**

`commons-adoption.test.ts`: importar `AppointmentStatus`, `TenantType`, `standardResponseSchema`, `ErrorCodes` desde `@neutra/commons` y asertar que coinciden con los valores usados hoy por la API (`AppointmentStatus.PENDING`, `TenantType.STORE`, `ErrorCodes.AUTH_INVALID_CREDENTIALS`). Antes de agregar la dependencia, falla con "Cannot find module '@neutra/commons'".

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `bun run --cwd apps/api test:unit -- commons-adoption`
Expected: FAIL.

- [ ] **Step 3: Adoptar commons**

Agregar `"@neutra/commons": "workspace:*"` y el script `"typecheck": "tsc --noEmit"` a `apps/api/package.json`; `bun install` desde el root. Reemplazar imports: enums/entidades → `@neutra/commons`; envelope/códigos → `@neutra/commons`. Mover `AppError` y los resolvers a los archivos nuevos, actualizando sus imports internos. Borrar las definiciones duplicadas. **No tocar todavía la validación** (Task 8).

- [ ] **Step 4: Verificar suite completa**

```bash
bun run --cwd packages/commons build
bun run --cwd apps/api test
bun run --cwd apps/api typecheck
```

Expected: 73 suites / 712 tests PASS; `tsc` limpio; el test de adopción pasa.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(api): consume @neutra/commons contracts"
```

---

### Task 8: Reemplazo total de class-validator por Zod (D7)

**Files:**
- Modify: `apps/api/middleware/validation.middleware.ts`, los 10 archivos de rutas con 16 call sites (`infrastructure/routes/{appointment,category,coupon,log,order,permission,role,service,slide,staff}.routes.ts`), `apps/api/package.json`
- Delete: los 20 DTOs de `apps/api/core/application/dtos/requests/**`
- Test: `apps/api/test/validation-zod.test.ts` + reutilizar `apps/api/test/validation-golden.test.ts`

**Interfaces:**
- Consumes: schemas de Task 5; `ErrorCodes`/`ErrorDetail` de Task 4.
- Produces: `validateDto(schema: ZodType)` y `validateQueryDto(schema: ZodType)` con la misma firma de middleware Express; escriben `req.validatedBody` / `req.validatedQuery`.

- [ ] **Step 1: Escribir test que falla**

`validation-zod.test.ts`: invocar `validateQueryDto(<schema de page>)` con `req.query = { page: "2" }` y un `next` mock; asertar que `req.validatedQuery.page === 2` y que con `page: "abc"` se llama a `res.apiError` con `status 400`, `code VALIDATION_INVALID_FORMAT`, `field: "page"`. Falla antes del cambio porque el middleware espera una clase, no un schema.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `bun run --cwd apps/api test:unit -- validation-zod`
Expected: FAIL.

- [ ] **Step 3: Reescribir el middleware**

`validateDto`/`validateQueryDto` reciben `ZodType`, usan `safeParse`, y en error mapean cada `issue` a `ErrorDetail { code: ValidationErrorCodes.INVALID_FORMAT, message: issue.message, field: issue.path.join("."), domain: "validation" }`, con status `400` y mensaje agregador `"Validación fallida"`. En éxito asignan `req.validatedBody`/`req.validatedQuery` al resultado parseado y llaman a `next()`. `composeValidators` pasa a componer schemas con `.and()`.

- [ ] **Step 4: Migrar los 16 call sites y borrar los DTOs de clase**

Sustituir cada `validateQueryDto(XQueryDto)` por `validateQueryDto(xQuerySchema)` del schema correspondiente de `@neutra/commons`. Igual para los `validateDto` de body. Borrar los 20 archivos de request DTO. Actualizar imports en toda la API.

- [ ] **Step 5: Verificar golden + suite**

```bash
bun run --cwd apps/api test:unit -- validation-zod
bun run --cwd apps/api test:unit -- validation-golden
bun run --cwd apps/api test
grep -r --include='*.ts' -nE 'class-validator|class-transformer' apps/api/core apps/api/middleware apps/api/infrastructure apps/api/test || echo "clean"
```

Expected: tests PASS, snapshot sin diff, grep imprime `clean`, 712 tests en verde.

- [ ] **Step 6: Quitar dependencias y commitear**

Quitar `class-validator` y `class-transformer` de `apps/api/package.json`; asegurar `zod` declarado con la misma major que commons. `bun install` desde root.

```bash
git add -A && git commit -m "refactor(api): replace class-validator with Zod across all DTOs"
```

---

### Task 9: Guards — raíz de `apps/api` y drift de commons

**Files:**
- Modify: `apps/api/scripts/api-doctor/adapters/architecture.adapter.ts`, `apps/api/package.json`, root `package.json`
- Create: `apps/api/scripts/check-commons-align.mjs`, `apps/api/test/guards-root.test.ts`

**Interfaces:**
- Consumes: `apps/api` ya reestructurado (Task 2) y `@neutra/commons` publicado (Task 3).
- Produces: scripts root `check:arch`, `doctor:api`, `commons:check`.

- [ ] **Step 1: Escribir test que falla**

`guards-root.test.ts`: ejecutar los tres scripts desde la raíz y asertar exit code 0; asertar que la salida del doctor contiene los 11 nombres de regla `layerDirection`, `entitiesAreTypes`, `domainExists`, `noDuplicatedRules`, `noPresenters`, `noHardcodedMoney`, `noRequireInCore`, `noHttpStatusInCore`, `portsIgnoreHttpDtos`, `authMiddlewareIsThin`, `tenantMiddlewareIsThin` (R1–R11), y que `commons:check` imprime `workspace:*` y `zod majors align`. Antes del cambio, los scripts root no existen.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `bun run check:arch && bun run doctor:api && bun run commons:check`
Expected: FAIL con "command not found".

- [ ] **Step 3: Adaptar los guards**

En `architecture.adapter.ts`, fijar `DoctorContext.rootDir` a `apps/api` (ruta absoluta calculada desde el script) sin tocar los prefijos `core/`, `infrastructure/`, `middleware/` de las reglas. Verificar que `check-architecture.ts` (`ROOT = __dirname/..`) ya resuelve `apps/api` y que `verify-production-build.ts` detecta `apps/api/package.json` como `projectRoot`. Portar `role/apps/api/scripts/check-commons-align.mjs` cambiando el nombre a `@neutra/commons`. Agregar los scripts a `apps/api/package.json` y al root vía turbo.

- [ ] **Step 4: Verificar**

```bash
bun run check:arch
bun run doctor:api -- --rules architecture.rules
bun run commons:check
bun run --cwd apps/api verify:production
```

Expected: todos exit 0; el doctor lista R1–R11; `verify:production` valida `/health` y `/ready`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: repoint architecture guards to apps/api and add commons drift check"
```

---

### Task 10: CI, Docker y configuración de build

**Files:**
- Move: `apps/api/.github/workflows/CI.yml` → `.github/workflows/CI.yml`
- Modify: `.github/workflows/CI.yml`, `apps/api/Dockerfile.dev`, `apps/api/Dockerfile.prod`, `apps/api/docker-compose.yml`, `apps/api/docker-compose.prod.yml`, `apps/api/docker-compose.debug.yml`
- Create: `scripts/verify-build-config.mjs`
- Verify unchanged: `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/prisma.config.ts` (ya son relativos a la app)

**Interfaces:**
- Consumes: Tasks 2 y 9.
- Produces: CI y Docker funcionales desde la raíz del monorepo.

- [ ] **Step 1: Escribir test que falla**

`verify-build-config.mjs`: asertar que `.github/workflows/CI.yml` existe en la raíz, contiene `bun install --frozen-lockfile` y `setup-bun`, y **no** contiene `npm ci`; que `apps/api/Dockerfile.prod` existe; que los archivos `docker-compose*` referencian contextos bajo `apps/api`; y que `bun run build` genera `apps/api/dist/app.js`.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node scripts/verify-build-config.mjs`
Expected: FAIL (workflow aún en `apps/api/.github/`).

- [ ] **Step 3: Adaptar CI**

Mover el workflow a la raíz. Sustituir `cache: npm` por `cache: bun` y `npm ci` por `bun install --frozen-lockfile`. Los pasos de Prisma pasan a `bun run --cwd apps/api prisma generate|migrate deploy|db seed` (o turbo filter `--filter=api`). `commons:check` antes de typecheck/test. `check:arch` y `doctor:api` vía scripts root. Servicios Postgres/Redis y env sin cambios. Mantener el path `.jest-cache` del cache.

- [ ] **Step 4: Adaptar Docker**

Ajustar los `COPY`/`WORKDIR` de los Dockerfiles a `apps/api` como contexto (o raíz con `-f apps/api/Dockerfile.prod`). Actualizar los `build.context`/`dockerfile` en los tres docker-compose. Agregar el servicio `cms` con `apps/cms/Dockerfile` en el task 11 (aquí solo dejar el hueco documentado).

- [ ] **Step 5: Verificar**

```bash
node scripts/verify-build-config.mjs
bun run build
bun run --cwd apps/api verify:production
```

Expected: PASS; `apps/api/dist/app.js` y Swagger con `/health`, `/ready`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "ci: parametrize workflow and Docker for monorepo root"
```

---

### Task 11: Importar `neutra-cms` como `apps/cms`

**Files:**
- Move: historial y working tree de `neutra-cms` → `apps/cms/`
- Create: `scripts/verify-cms.mjs`, `apps/cms/README.md`
- Delete: `apps/cms/package-lock.json`

**Interfaces:**
- Consumes: root del monorepo (Task 2).
- Produces: `apps/cms` como workspace `cms` con Strapi 5.57 y la actualización de dependencias preservada.

- [ ] **Step 1: Escribir test que falla**

`verify-cms.mjs`: asertar que `apps/cms/package.json` existe con `name === "neutra-cms"` (o `cms` si se renombra en el commit, decisión del implementer: el workspace se identifica por la carpeta, no por el name), que no existe `apps/cms/package-lock.json`, que `git log` contiene `5678693` (HEAD del CMS) y `be4a097`, y que el diff importado contiene `"@strapi/strapi": "^5.57.0"` y `"typescript": "^7.0.2"`.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node scripts/verify-cms.mjs`
Expected: FAIL (apps/cms no existe).

- [ ] **Step 3: Importar historial y working tree**

```bash
cd /mnt/c/Users/leonardo/Repositories/neutra
git remote add cms ../neutra-cms
git fetch cms
git merge --allow-unrelated-histories cms/main
mkdir apps/cms
# mover archivos trackeados del CMS a apps/cms/ con git mv
git -C ../neutra-cms diff > /tmp/cms-uncommitted.patch
git apply --directory=apps/cms /tmp/cms-uncommitted.patch
rm apps/cms/package-lock.json
bun install
```

No se commitea ni se modifica nada en el repo fuente `neutra-cms`. Si `bun install` o `strapi build` fallan con las versiones importadas, revertir `package.json` de `apps/cms` a las versiones commiteadas (`@strapi/strapi 5.52.1`, `typescript ^5`) dentro de este commit y documentar la reversión en `apps/cms/README.md`.

- [ ] **Step 4: Verificar**

```bash
node scripts/verify-cms.mjs
bun run --cwd apps/cms build
```

Expected: PASS; `strapi build` termina sin error.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cms): import Strapi app into the monorepo"
```

---

### Task 12: Gate final del DoD

**Files:**
- Create: `scripts/verify-dod.mjs`
- Modify: `docs/...` (solo si hay que documentar la degradación del drift del front)

**Interfaces:**
- Consumes: todos los tasks anteriores.
- Produces: estado verificable del criterio de "hecho" del spec.

- [ ] **Step 1: Escribir el verificador**

`verify-dod.mjs`: asertar (1) `bun.lock` único y ausencia de `package-lock.json` en `apps/*` y `packages/*`; (2) `grep` de `class-validator|class-transformer` en `apps/api` → 0 coincidencias; (3) `grep` de `@neutra/commons` en `apps/api/package.json` con `workspace:*`; (4) `grep` de `node:|@prisma/client|from "express"` en `packages/commons/src` → 0; (5) `git log` con los 5 SHAs; (6) `git status` limpio; (7) `git -C ../neutra-frontend status --porcelain` es idéntico a `scripts/.frontend-baseline.txt` (creado en Task 2), de modo que ningún cambio del front provenga de esta migración.

- [ ] **Step 2: Ejecutar la batería completa**

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
bun run check:arch
bun run doctor:api
bun run commons:check
bun run --cwd apps/cms build
node scripts/verify-dod.mjs
```

Expected: todo exit 0; API 73 suites / 712 tests; R1–R11 verdes; `verify-dod.mjs` PASS.

- [ ] **Step 3: Documentar la degradación consentida (D10)**

Agregar una nota en `README.md`: el test `neutra-frontend/src/lib/__tests__/error-codes.test.ts` ya no lee `../api-neutra-v2/types/error-codes.ts`; el guard queda ciego hasta que el front se incorpore como `apps/web` en fase 2. No se toca `neutra-frontend`.

- [ ] **Step 4: Commit final**

```bash
git add -A && git commit -m "chore: verify monorepo migration acceptance criteria"
```
