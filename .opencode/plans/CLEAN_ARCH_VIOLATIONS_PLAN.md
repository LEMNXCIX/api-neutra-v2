# Plan: Violaciones de Clean Architecture — Mejoras Estructurales

## 1. Diagnóstico

Este documento lista las violaciones a Clean/Hexagonal Architecture detectadas durante el análisis de Response DTOs. Son problemas separados del over-fetching pero que impactan mantenibilidad y consistencia.

---

## 2. Violaciones Encontradas

### 2.1 [CRÍTICA] Controllers acceden directamente al Repository (bypass del Use Case)

**Principio violado:** En Clean Architecture, el Controller (adaptador primario) NO debe conocer la capa de persistencia. Solo debe comunicarse con Use Cases (capa de aplicación).

| Controller | Método | Repository accedido directamente | Línea |
|------------|--------|--------------------------------|-------|
| `AppointmentController` | `getById()` | `this.appointmentRepository.findById()` | `:73` |
| `AppointmentController` | `cancel()` | `this.appointmentRepository.update()` | `:93` |
| `StaffController` | `getMe()` | `this.staffRepository.findByUserId()` | `:116` |
| `StaffController` | `assignService()` | `this.staffRepository.assignService()` | `:65` |
| `StaffController` | `syncServices()` | `this.staffRepository.syncServices()` | `:92` |
| `LogController` | `getAll()` | `this.logRepository.findAll()` | `:18` |
| `LogController` | `getStats()` | `this.logRepository.getStats()` | `:45` |

**Problema:** El controller tiene una dependencia directa al repositorio (infraestructura), rompiendo la regla de dependencia. Si se cambia la implementación del repositorio, el controller se ve afectado.

**Solución:** Crear Use Cases para cada una de estas operaciones:
- `GetAppointmentByIdUseCase`
- `CancelAppointmentUseCase`
- `GetStaffByUserIdUseCase`
- `AssignStaffServiceUseCase`
- `SyncStaffServicesUseCase`
- `GetLogsUseCase`
- `GetLogStatsUseCase`

---

### 2.2 [ALTA] Controllers con lógica de negocio (Super Admin bypass)

**Principio violado:** El Controller NO debe contener lógica de negocio. Solo debe adaptar HTTP → Use Case → HTTP.

| Controller | Método | Lógica de negocio | Línea |
|------------|--------|-------------------|-------|
| `AppointmentController` | `getAll()` | Super Admin bypass logic, tenant ID filtering | `:46-53` |
| `StaffController` | `getAll()` | Super Admin bypass logic | `:31-37` |
| `ServiceController` | `getAll()` | Super Admin bypass logic | `:29-36` |
| `BannerController` | `getAll()` | Super Admin bypass logic (presumible) | — |

**Problema:** La lógica de "si es SUPER_ADMIN puede ver todos los tenants" es regla de negocio que pertenece al Use Case, no al controller. Si se añade otro rol con permisos similares, hay que cambiar el controller.

**Solución:** Pasar `user.role` al Use Case y que él decida el scope de tenant:
```typescript
// Use Case
async execute(tenantId: string | undefined, userRole: string, filters?: any) {
  if (userRole === 'SUPER_ADMIN' && !tenantId) {
    // Allow cross-tenant query
  }
  // ...
}
```

---

### 2.3 [ALTA] `WhatsAppConfigController` bypass total de patrones

**Principio violado:** El controller no usa UseCaseResult, no usa StandardResponse, no usa Presenters. Tiene try/catch manual y retorna shapes inconsistentes.

| Método | Problema | Línea |
|--------|----------|-------|
| `getConfig()` | try/catch manual, `{ error }` en vez de StandardResponse | `:16-36` |
| `updateConfig()` | Retorna resultado crudo del Use Case (con accessToken expuesto), try/catch manual | `:42-58` |

**Solución:** 
1. `getConfig()` → crear `GetWhatsAppConfigUseCase` + `WhatsAppConfigPresenter`
2. `updateConfig()` → el Use Case ya existe (`ConfigureWhatsAppUseCase`), solo necesita Presenter + UseCaseResult

---

### 2.4 [ALTA] `FeatureController` usa try/catch manual y shape manual

**Principio violado:** Repite lógica de error handling que ya está en el middleware global de errores.

```typescript
// FeatureController — ANTI-PATRÓN
async getAll(req: Request, res: Response) {
  try {
    const features = await this.getFeaturesUseCase.execute();
    res.json({ success: true, data: features }); // Manual shape
  } catch (error: any) {
    this.logger.error(`Error getting features: ${error.message}`);
    res.status(500).json({ success: false, message: error.message }); // Manual error
  }
}
```

**Problema:** 
1. El try/catch es redundante — el error middleware global ya captura excepciones
2. El shape `{ success, data }` es manual — debería usar `Success()` helper
3. El Feature use case retorna `Feature[]` directamente, no `UseCaseResult`

**Solución:** 
1. Feature use cases deben retornar `UseCaseResult`
2. Controller debe delegar error handling al middleware global
3. Usar `Success()` helper

---

### 2.5 [ALTA] `request-dto.d.ts` — Archivo de declaración con runtime code

**Principio violado:** Los archivos `.d.ts` son para declaraciones de tipo puras. NO deben contener código ejecutable (decoradores `class-validator`).

**Archivo:** `types/request-dto.d.ts`

**Problema:** Contiene decoradores como `@IsString`, `@IsEmail` que son runtime code dentro de un archivo de declaración. Esto puede causar problemas con TypeScript compilation y bundlers.

**Solución:** Renombrar a `types/request-dto.ts` o mover a `core/application/dtos/requests/` como parte de la unificación de DTOs (Fase 5 del plan de Response DTOs).

---

### 2.6 [MEDIA] Input DTOs duplicados y desincronizados

**Principio violado:** DRY (Don't Repeat Yourself) y Single Source of Truth.

| Entidad | DTO en `entity.ts` | DTO en `request-dto.d.ts` | Desincronización |
|---------|-------------------|--------------------------|------------------|
| Product | `CreateProductDTO` | `ProductCreateDto` | `request-dto.d.ts` falta `ownerId` |
| User | `CreateUserDTO` | `CreateUserDto` | Mismos campos pero interfaces separadas |
| Login | N/A | `LoginDto` | Solo en `request-dto.d.ts` |
| Cart | N/A | `AddToCartDto` | Solo en `request-dto.d.ts` |
| Order | N/A | `CreateOrderDto` | Solo en `request-dto.d.ts` |

**Solución:** Unificar en `core/application/dtos/requests/` con decoradores `class-validator` como parte de la Fase 5.

---

### 2.7 [MEDIA] `AppointmentController` tiene 8 dependencias en el constructor

**Principio violado:** Single Responsibility Principle y Law of Demeter.

```typescript
constructor(
  private createAppointmentUseCase: CreateAppointmentUseCase,
  private getAppointmentsUseCase: GetAppointmentsUseCase,
  private getAvailabilityUseCase: GetAvailabilityUseCase,
  private updateAppointmentStatusUseCase: UpdateAppointmentStatusUseCase,
  private deleteAppointmentUseCase: DeleteAppointmentUseCase,
  private appointmentRepository: IAppointmentRepository,  // ← REPOSITORIO DIRECTO
  private featureRepository: IFeatureRepository,           // ← REPOSITORIO DIRECTO
  private queueProvider: IQueueProvider,                    // ← INFRAESTRUCTURA DIRECTA
  private logger: ILogger
)
```

**Problema:** 8 dependencias, 2 de las cuales son repositorios (bypass de use cases) y 1 es infraestructura de queue.

**Solución:** 
1. Eliminar dependencias de repositorio creando use cases (ver 2.1)
2. La dependencia de `queueProvider` debería ir en un Use Case, no en el controller

---

### 2.8 [MEDIA] Orphan use case fuera de la estructura

**Archivo:** `core/use-cases/order/get-order-stats.use-case.ts`

**Problema:** Existe una carpeta `core/use-cases/` legacy que debería haber sido eliminada al migrar a `core/application/`. Este archivo usa el shape legacy `{ success, code, message, data }` en vez de `UseCaseResult`.

**Solución:** Mover a `core/application/order/get-order-stats.use-case.ts` y migrar a `UseCaseResult`.

---

### 2.9 [MEDIA] `LogController` no tiene capa de Use Case

**Problema:** `LogController` accede directamente al repositorio sin pasar por Use Cases. No hay validación, no hay lógica de aplicación, no hay Presenter.

**Solución:** Crear `GetLogsUseCase` y `GetLogStatsUseCase`.

---

### 2.10 [BAJA] `mapToEntity()` usa `any` en repositorios

**Principio violado:** Type safety. Los repositorios deberían mapear desde tipos Prisma específicos, no `any`.

| Repositorio | Patrón | Tipo del parámetro `mapToEntity` |
|-------------|--------|--------------------------------|
| `user.prisma-repository.ts` | `...userData` spread | `any` |
| `appointment.prisma-repository.ts` | Mapeo explícito | `any` |
| `order.prisma-repository.ts` | Mapeo explícito | `any` |
| `coupon.prisma-repository.ts` | `as Coupon` cast | `any` |
| `banner.prisma-repository.ts` | `as Banner[]` cast | `any` |
| `cart.prisma-repository.ts` | `as unknown as Cart` | `any` |

**Solución:** Usar los tipos generados por Prisma (`Prisma.UserGetPayload<{include: {...}}>`) como tipo de entrada de `mapToEntity`. Esto da type safety en el mapeo.

---

## 3. Plan de Acción

### Prioridad 1: Controllers que bypassean Use Cases

| # | Tarea | Nuevo Use Case | Archivo controller |
|---|-------|---------------|-------------------|
| 1.1 | Eliminar acceso directo a `appointmentRepository` en `getById()` | `GetAppointmentByIdUseCase` | `appointment.controller.ts:73` |
| 1.2 | Eliminar acceso directo a `appointmentRepository` en `cancel()` | `CancelAppointmentUseCase` | `appointment.controller.ts:93` |
| 1.3 | Eliminar acceso directo a `staffRepository` en `getMe()` | `GetStaffByUserIdUseCase` | `staff.controller.ts:116` |
| 1.4 | Eliminar acceso directo a `staffRepository` en `assignService()` | `AssignStaffServiceUseCase` | `staff.controller.ts:65` |
| 1.5 | Eliminar acceso directo a `staffRepository` en `syncServices()` | `SyncStaffServicesUseCase` | `staff.controller.ts:92` |
| 1.6 | Crear Use Cases para `LogController` | `GetLogsUseCase`, `GetLogStatsUseCase` | `log.controller.ts` |
| 1.7 | Crear Use Case para WhatsApp config GET | `GetWhatsAppConfigUseCase` | `whatsapp-config.controller.ts:16` |

### Prioridad 2: Lógica de negocio en Controllers

| # | Tarea | Controller | Método |
|---|-------|-----------|--------|
| 2.1 | Mover Super Admin bypass a Use Cases | `AppointmentController` | `getAll()` |
| 2.2 | Mover Super Admin bypass a Use Cases | `StaffController` | `getAll()` |
| 2.3 | Mover Super Admin bypass a Use Cases | `ServiceController` | `getAll()` |

### Prioridad 3: Estandarización de patrones

| # | Tarea | Detalle |
|---|-------|---------|
| 3.1 | Feature use cases → retornar `UseCaseResult` | Eliminar try/catch manual en controller |
| 3.2 | WhatsAppConfigController → usar UseCaseResult + Presenter | Eliminar try/catch manual y shapes inconsistentes |
| 3.3 | Mover orphan `get-order-stats.use-case.ts` | `core/use-cases/` → `core/application/order/` |
| 3.4 | Renombrar `request-dto.d.ts` → `request-dto.ts` | O mover a `core/application/dtos/requests/` |

### Prioridad 4: Type safety en repositorios

| # | Tarea | Detalle |
|---|-------|---------|
| 4.1 | Tipar `mapToEntity` con tipos Prisma en `user.prisma-repository.ts` | Usar `Prisma.UserGetPayload<...>` |
| 4.2 | Eliminar `as` casts en `coupon`, `banner`, `cart` repositories | Mapeo explícito tipado |
| 4.3 | Eliminar spread `...userData` en `user.mapToEntity()` | Mapeo campo por campo |

---

## 4. Dependencias con el plan de Response DTOs

| Tarea de este plan | Depende de (Response DTO Plan) |
|--------------------|-------------------------------|
| 1.1 `GetAppointmentByIdUseCase` | Fase 1.9 `AppointmentPresenter` — el use case debe retornar data que el controller pase por Presenter |
| 1.7 `GetWhatsAppConfigUseCase` | Fase 1.12 `WhatsAppConfigPresenter` — para masking de tokens |
| 3.2 `WhatsAppConfigController` estandarización | Fase 1.13 — fix updateConfig |

**Recomendación:** Ejecutar primero Fase 1 del plan de Response DTOs (security hotfix), luego Prioridad 1 de este plan (use cases faltantes), ya que ambas modifican los mismos controllers.

---

## 5. No incluido (futuro)

| Tema | Razón |
|------|-------|
| Unificación de Input DTOs (`entity.ts` vs `request-dto.d.ts`) | Requiere Zod — Fase 5 del plan de Response DTOs |
| `class-validator` → Zod | Migración grande, requiere Input DTOs unificados primero |
| `AppointmentController` — eliminar `queueProvider` del constructor | El enqueue de notificaciones debe estar en el Use Case, no en el Controller |
