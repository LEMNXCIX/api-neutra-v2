# Plan: Capa de Response DTOs — Solución de Raíz al Over-fetching y Exposición de Datos Sensibles

## 1. Diagnóstico

### 1.1 Flujo actual de datos (el problema)

```
Controller → UseCase.execute() → Repository → Prisma → DB
    ↓
Controller ← res.json(result) ← UseCaseResult ← mapToEntity ← Prisma result (SIN FILTRO)
    ↓
Response Middleware intercepta res.json() → envuelve en StandardResponse
    ↓
Cliente recibe TODO lo que Prisma retorna
```

**No existe ninguna capa de transformación entre la entidad de dominio y la respuesta HTTP.**

### 1.2 Datos sensibles expuestos

| Severidad | Campo expuesto | Endpoints afectados | Origen |
|-----------|---------------|---------------------|--------|
| **CRÍTICO** | `password` (bcrypt hash) | `GET /api/admin/users`, `GET /api/admin/users/:id` | `user.prisma-repository.ts` — `mapToEntity()` usa spread `...userData` |
| **CRÍTICO** | `password` vía relaciones | `GET /api/appointments`, `GET /api/appointments/:id` | `appointment.prisma-repository.ts` — `include: { user: true }` |
| **ALTO** | `resetPasswordToken`, `resetPasswordExpires` | Todos los endpoints que retornan `user` | `user.prisma-repository.ts` — `mapToEntity()` spread |
| **ALTO** | `accessToken`, `webhookVerifyToken` | `POST /api/admin/whatsapp/config` | `whatsapp-config.controller.ts` — retorna resultado directo del use case |
| **MEDIO** | `googleId`, `facebookId`, `twitterId`, `githubId` | Todos los endpoints que retornan `user` | `user.prisma-repository.ts` — `mapToEntity()` spread |
| **MEDIO** | `pushToken` | Todos los endpoints que retornan `user` | `user.prisma-repository.ts` — `mapToEntity()` spread |

### 1.3 Over-fetching por entidad

| Entidad | Campos retornados innecesariamente | Relaciones sobre-incluidas |
|---------|-----------------------------------|---------------------------|
| **User** | `password`, `resetPasswordToken`, `resetPasswordExpires`, `googleId`, `facebookId`, `twitterId`, `githubId`, `pushToken` | `tenants + tenant + role + permissions + permission` en `findAll()` |
| **Appointment** | `tenantId`, `confirmationSent`, `reminderSent` (contexto interno) | `user: true` (full user), `staff: true` (con `userId` interno), `coupon: true` |
| **Order** | `userId` (expuesto como FK, pero ya tiene `user` embebido) | `user: { select: { name, email } }` — este está BIEN hecho |
| **Staff** | `userId` (FK interno), `tenantId` | No incluye user, pero retorna campos internos |
| **WhatsAppConfig** | `accessToken`, `webhookVerifyToken` | N/A |

### 1.4 Inconsistencias de patrón de retorno en Use Cases

| Patrón | Shape | Usado por | Tiene `code`? |
|--------|-------|-----------|---------------|
| **UseCaseResult** (nuevo) | `{ success, message, data?, errors? }` vía `Success()` | categories, coupons, banners, cart, orders (partial), roles, permissions, slides, booking (staff/service/appointment), users (partial) | NO |
| **Legacy object** (viejo) | `{ success, code, message, data, errors }` | auth, products (partial), users stats, order stats, order statuses, order paginated, cart stats, staff, services | YES |
| **Direct return** (crudo) | Retorna `Feature[]`, `Feature` directamente; o throw Error | features (todos los use cases) | NO |

### 1.5 Inconsistencias de patrón de respuesta en Controllers

| Patrón | Controllers | Código |
|--------|-------------|--------|
| **A: UseCaseResult pass-through** | user, appointment (create, getAll, updateStatus, delete), category, product, cart, coupon, banner, slide, role, permission, tenant | `return res.json(result)` |
| **B: Legacy con `result.code`** | staff, service, auth (forgotPassword, resetPassword) | `return res.status(result.code).json(result)` |
| **C: Manual `{ success, data }`** | appointment (getById, cancel), feature, log, staff (getMe, assignService, syncServices) | Construcción manual del objeto |
| **D: authResponse helper** | auth (login, signup, socialLogin) | `authResponse(req, res, result, statusCode)` |
| **E: Bypass completo** | whatsapp-config (getConfig, updateConfig) | `res.status(200).json(config)` — sin StandardResponse |

### 1.6 Repositories que usan `user: true` (full include)

| Repositorio | Método | Include Pattern | Expone password? |
|-------------|--------|-----------------|------------------|
| `appointment.prisma-repository.ts` | `findAll()`, `findById()` | `user: true` | **SÍ** |
| `appointment.prisma-repository.ts` | `create()` | `select: { name, email }` | No — inconsistente |
| `order.prisma-repository.ts` | `findById()`, `findByUserId()`, `findAll()`, `findAllPaginated()`, `updateStatus()`, `update()` | `user: { select: { name, email } }` | No — bien hecho |
| `user.prisma-repository.ts` | `findAll()`, `findById()`, `findByEmail()`, `create()`, `update()`, `findByProvider()` | `include: { tenants: { ... } }` | **SÍ** (spread en mapToEntity) |

---

## 2. Solución Arquitectónica

### 2.1 Principio: Presenter Pattern en Clean Architecture

En Clean Architecture, la transformación de datos para la capa de presentación es responsabilidad de un **Presenter**. El Presenter toma la salida del Use Case (entidad de dominio) y la convierte en un **ViewModel** (o Response DTO) que es lo que el Controller envía al cliente.

```
Controller → UseCase.execute() → Repository → Prisma → DB
    ↓
Controller ← Presenter.toResponse(entity) ← UseCaseResult
    ↓
Response Middleware → StandardResponse { data: ResponseDTO }
    ↓
Cliente recibe SOLO los campos declarados en el Response DTO
```

**¿Por qué Presenter y no interceptor?** Porque en Clean Architecture el Controller es el adaptador primario — él decide qué Presenter usar. Un interceptor global sería opaco y escondería la lógica de transformación.

**¿Por qué no `class-transformer` con `@Expose()`/`@Exclude()`?** Porque las entidades actuales son **interfaces**, no clases. `class-transformer` solo funciona con clases decoradas. Convertir 18 interfaces a clases con decoradores es un cambio masivo con alto riesgo de regresión y mezcla concerns de serialización en el dominio. El Presenter pattern es más limpio: separa la responsabilidad de presentación sin tocar las entidades de dominio.

### 2.2 Estructura de carpetas propuesta

```
core/
├── application/
│   └── dtos/
│       └── responses/
│           ├── shared/
│           │   ├── user-minimal.response.ts     # { id, name, email, phone, profilePic }
│           │   ├── staff-minimal.response.ts    # { id, name, avatar }
│           │   └── service-minimal.response.ts  # { id, name, duration, price }
│           ├── user/
│           │   ├── user.response.ts             # Response completo (admin)
│           │   └── user-public.response.ts      # Response público (sin campos sensibles)
│           ├── appointment/
│           │   ├── appointment.response.ts       # Response completo con relaciones
│           │   └── appointment-list.response.ts  # Response para listas (más ligero)
│           ├── order/
│           │   ├── order.response.ts
│           │   └── order-list.response.ts
│           ├── staff/
│           │   └── staff.response.ts
│           ├── service/
│           │   └── service.response.ts
│           ├── product/
│           │   └── product.response.ts
│           ├── category/
│           │   └── category.response.ts
│           ├── coupon/
│           │   └── coupon.response.ts
│           ├── banner/
│           │   └── banner.response.ts
│           ├── slide/
│           │   └── slide.response.ts
│           ├── role/
│           │   └── role.response.ts
│           ├── permission/
│           │   └── permission.response.ts
│           ├── tenant/
│           │   └── tenant.response.ts
│           ├── cart/
│           │   └── cart.response.ts
│           ├── whatsapp/
│           │   └── whatsapp-config.response.ts
│           └── feature/
│               └── feature.response.ts
├── presenters/
│   ├── user.presenter.ts
│   ├── appointment.presenter.ts
│   ├── order.presenter.ts
│   ├── staff.presenter.ts
│   ├── service.presenter.ts
│   ├── product.presenter.ts
│   ├── category.presenter.ts
│   ├── coupon.presenter.ts
│   ├── banner.presenter.ts
│   ├── slide.presenter.ts
│   ├── role.presenter.ts
│   ├── permission.presenter.ts
│   ├── tenant.presenter.ts
│   ├── cart.presenter.ts
│   ├── whatsapp-config.presenter.ts
│   └── feature.presenter.ts
```

**¿Por qué `core/presenters/`?** Porque el Presenter es parte de la capa de aplicación — transforma entidades de dominio en DTOs de respuesta. No es infraestructura, es lógica de aplicación. Los DTOs de respuesta bajo `core/application/dtos/responses/` son contratos de la capa de aplicación.

### 2.3 Patrón de implementación

#### Response DTO (interfaz + clase con mapeo estático)

```typescript
// core/application/dtos/responses/shared/user-minimal.response.ts
export interface IUserMinimalResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  profilePic?: string | null;
}

export class UserMinimalResponse {
  static fromEntity(user: any): IUserMinimalResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      profilePic: user.profilePic ?? null,
    };
  }
}
```

```typescript
// core/application/dtos/responses/appointment/appointment.response.ts
import { AppointmentStatus } from '@/core/entities/appointment.entity';
import { UserMinimalResponse, IUserMinimalResponse } from '../shared/user-minimal.response';
import { StaffMinimalResponse, IStaffMinimalResponse } from '../shared/staff-minimal.response';
import { ServiceMinimalResponse, IServiceMinimalResponse } from '../shared/service-minimal.response';

export interface IAppointmentResponse {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string | null;
  discountAmount: number;
  subtotal: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  user?: IUserMinimalResponse;
  staff?: IStaffMinimalResponse;
  service?: IServiceMinimalResponse;
}

export class AppointmentResponse {
  static fromEntity(appointment: any): IAppointmentResponse {
    return {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes,
      cancellationReason: appointment.cancellationReason ?? null,
      discountAmount: appointment.discountAmount ?? 0,
      subtotal: appointment.subtotal ?? 0,
      total: appointment.total ?? 0,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      user: appointment.user ? UserMinimalResponse.fromEntity(appointment.user) : undefined,
      staff: appointment.staff ? StaffMinimalResponse.fromEntity(appointment.staff) : undefined,
      service: appointment.service ? ServiceMinimalResponse.fromEntity(appointment.service) : undefined,
    };
  }
}
```

#### Presenter (orquesta la transformación)

```typescript
// core/presenters/appointment.presenter.ts
import { AppointmentResponse, IAppointmentResponse } from '@/core/application/dtos/responses/appointment/appointment.response';
import { AppointmentListResponse, IAppointmentListResponse } from '@/core/application/dtos/responses/appointment/appointment-list.response';

export class AppointmentPresenter {
  static toResponse(appointment: any): IAppointmentResponse {
    return AppointmentResponse.fromEntity(appointment);
  }

  static toResponseList(appointments: any[]): IAppointmentListResponse[] {
    return appointments.map(a => AppointmentListResponse.fromEntity(a));
  }
}
```

#### Controller (usa el Presenter)

```typescript
// Antes (INSEGURO):
async getById(req: Request, res: Response) {
  const appointment = await this.appointmentRepository.findById(tenantId, id, true);
  return res.json({ success: true, data: appointment }); // password leak!
}

// Después (SEGURO):
async getById(req: Request, res: Response) {
  const appointment = await this.appointmentRepository.findById(tenantId, id, true);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
  const data = AppointmentPresenter.toResponse(appointment);
  return res.json(Success(data, 'Appointment retrieved successfully'));
}
```

### 2.4 Decisión: `class-transformer` vs `static fromEntity()`

| Criterio | `class-transformer` + `@Expose()` | `static fromEntity()` |
|----------|-----------------------------------|----------------------|
| Requiere cambiar entidades a clases | **SÍ** — todas las interfaces → clases | No — funciona con interfaces |
| Riesgo de regresión | Alto — cambio masivo en dominio | Bajo — capa nueva independiente |
| Acoplamiento al dominio | Alto — decoradores en entidades | Bajo — mapeo explícito en DTO |
| Validación en runtime | Sí (si `plainToInstance` + `excludeExtraneousValues`) | Sí (constructor explícito) |
| Mantenibilidad | Frágil — nuevo campo en entidad se filtra si falta `@Exclude()` | Seguro — solo mapea lo explícito |
| Compatibilidad con OpenAPI/Zod | Requiere paso extra | Nativo — las interfaces son el contrato |

**Decisión: `static fromEntity()`** — explícito, seguro, sin tocar el dominio, y las interfaces generan directamente contratos OpenAPI.

---

## 3. Fases de Implementación

### Fase 1: Fundamentos y Security Hotfix (URGENTE)

**Objetivo:** Crear la infraestructura de Response DTOs y cerrar las brechas de seguridad inmediatamente.

**Tareas:**

| # | Tarea | Archivos nuevos | Archivos modificados | Prioridad |
|---|-------|-----------------|---------------------|-----------|
| 1.1 | Crear `UserMinimalResponse` (shared DTO) | `core/application/dtos/responses/shared/user-minimal.response.ts` | — | CRÍTICA |
| 1.2 | Crear `UserPublicResponse` (sin campos sensibles) | `core/application/dtos/responses/user/user-public.response.ts` | — | CRÍTICA |
| 1.3 | Crear `UserResponse` (admin, incluye role/tenants, sin password) | `core/application/dtos/responses/user/user.response.ts` | — | CRÍTICA |
| 1.4 | Crear `UserPresenter` | `core/presenters/user.presenter.ts` | — | CRÍTICA |
| 1.5 | Actualizar `UserController` — usar `UserPresenter` | — | `interface-adapters/controllers/user.controller.ts` | CRÍTICA |
| 1.6 | Crear `StaffMinimalResponse` (shared DTO) | `core/application/dtos/responses/shared/staff-minimal.response.ts` | — | CRÍTICA |
| 1.7 | Crear `ServiceMinimalResponse` (shared DTO) | `core/application/dtos/responses/shared/service-minimal.response.ts` | — | CRÍTICA |
| 1.8 | Crear `AppointmentResponse` + `AppointmentListResponse` | `core/application/dtos/responses/appointment/appointment.response.ts`, `.../appointment-list.response.ts` | — | CRÍTICA |
| 1.9 | Crear `AppointmentPresenter` | `core/presenters/appointment.presenter.ts` | — | CRÍTICA |
| 1.10 | Actualizar `AppointmentController` — usar `AppointmentPresenter` | — | `interface-adapters/controllers/appointment.controller.ts` | CRÍTICA |
| 1.11 | Crear `WhatsAppConfigResponse` (masking de tokens) | `core/application/dtos/responses/whatsapp/whatsapp-config.response.ts` | — | ALTA |
| 1.12 | Crear `WhatsAppConfigPresenter` | `core/presenters/whatsapp-config.presenter.ts` | — | ALTA |
| 1.13 | Actualizar `WhatsAppConfigController` — usar Presenter, fix updateConfig | — | `interface-adapters/controllers/whatsapp-config.controller.ts` | ALTA |

**Resultado de Fase 1:** Passwords y tokens YA NO se exponen. Appointments retornan solo data relevante.

---

### Fase 2: Response DTOs para el resto de entidades

**Objetivo:** Cubrir todas las entidades restantes con Response DTOs.

**Tareas:**

| # | Tarea | Archivos nuevos | Archivos modificados |
|---|-------|-----------------|---------------------|
| 2.1 | Crear `OrderResponse` + `OrderListResponse` | `core/application/dtos/responses/order/` | — |
| 2.2 | Crear `OrderPresenter` | `core/presenters/order.presenter.ts` | — |
| 2.3 | Actualizar `OrderController` | — | `interface-adapters/controllers/order.controller.ts` |
| 2.4 | Crear `StaffResponse` | `core/application/dtos/responses/staff/` | — |
| 2.5 | Crear `StaffPresenter` | `core/presenters/staff.presenter.ts` | — |
| 2.6 | Actualizar `StaffController` | — | `interface-adapters/controllers/staff.controller.ts` |
| 2.7 | Crear `ServiceResponse` | `core/application/dtos/responses/service/` | — |
| 2.8 | Crear `ServicePresenter` | `core/presenters/service.presenter.ts` | — |
| 2.9 | Actualizar `ServiceController` | — | `interface-adapters/controllers/service.controller.ts` |
| 2.10 | Crear `ProductResponse` | `core/application/dtos/responses/product/` | — |
| 2.11 | Crear `ProductPresenter` | `core/presenters/product.presenter.ts` | — |
| 2.12 | Actualizar `ProductController` | — | `interface-adapters/controllers/product.controller.ts` |
| 2.13 | Crear `CategoryResponse` | `core/application/dtos/responses/category/` | — |
| 2.14 | Crear `CategoryPresenter` | `core/presenters/category.presenter.ts` | — |
| 2.15 | Actualizar `CategoryController` | — | `interface-adapters/controllers/category.controller.ts` |
| 2.16 | Crear `CouponResponse` | `core/application/dtos/responses/coupon/` | — |
| 2.17 | Crear `CouponPresenter` | `core/presenters/coupon.presenter.ts` | — |
| 2.18 | Actualizar `CouponController` | — | `interface-adapters/controllers/coupon.controller.ts` |
| 2.19 | Crear `BannerResponse` | `core/application/dtos/responses/banner/` | — |
| 2.20 | Crear `BannerPresenter` | `core/presenters/banner.presenter.ts` | — |
| 2.21 | Actualizar `BannerController` | — | `interface-adapters/controllers/banner.controller.ts` |
| 2.22 | Crear `SlideResponse` | `core/application/dtos/responses/slide/` | — |
| 2.23 | Crear `SlidePresenter` | `core/presenters/slide.presenter.ts` | — |
| 2.24 | Actualizar `SlideController` | — | `interface-adapters/controllers/slide.controller.ts` |
| 2.25 | Crear `RoleResponse` | `core/application/dtos/responses/role/` | — |
| 2.26 | Crear `RolePresenter` | `core/presenters/role.presenter.ts` | — |
| 2.27 | Actualizar `RoleController` | — | `interface-adapters/controllers/role.controller.ts` |
| 2.28 | Crear `PermissionResponse` | `core/application/dtos/responses/permission/` | — |
| 2.29 | Crear `PermissionPresenter` | `core/presenters/permission.presenter.ts` | — |
| 2.30 | Actualizar `PermissionController` | — | `interface-adapters/controllers/permission.controller.ts` |
| 2.31 | Crear `TenantResponse` | `core/application/dtos/responses/tenant/` | — |
| 2.32 | Crear `TenantPresenter` | `core/presenters/tenant.presenter.ts` | — |
| 2.33 | Actualizar `TenantController` | — | `interface-adapters/controllers/tenant.controller.ts` |
| 2.34 | Crear `CartResponse` | `core/application/dtos/responses/cart/` | — |
| 2.35 | Crear `CartPresenter` | `core/presenters/cart.presenter.ts` | — |
| 2.36 | Actualizar `CartController` | — | `interface-adapters/controllers/cart.controller.ts` |
| 2.37 | Crear `FeatureResponse` | `core/application/dtos/responses/feature/` | — |
| 2.38 | Crear `FeaturePresenter` | `core/presenters/feature.presenter.ts` | — |
| 2.39 | Actualizar `FeatureController` | — | `interface-adapters/controllers/feature.controller.ts` |

**Resultado de Fase 2:** TODAS las respuestas de la API pasan por Response DTOs. Cero over-fetching.

---

### Fase 3: Estandarización de patrones de retorno

**Objetivo:** Unificar los 3 patrones de retorno de Use Cases y los 5 patrones de Controllers en uno solo.

**Tareas:**

| # | Tarea | Detalle | Archivos modificados |
|---|-------|---------|---------------------|
| 3.1 | Agregar `Failure` helper a `UseCaseResult` | `const Failure = (message, errors?, code?) => ({ success: false, message, errors, code })` | `core/utils/use-case-result.ts` |
| 3.2 | Agregar `code` y `pagination` a `UseCaseResult` | Para que los controllers no necesiten leer status del legacy shape | `core/utils/use-case-result.ts` |
| 3.3 | Migrar use cases legacy a `UseCaseResult` | Auth use cases, product use cases, staff/service use cases, feature use cases, order stats/statuses/paginated | ~15-20 use cases |
| 3.4 | Eliminar `result.code` reads en controllers | Staff, Service, Auth controllers — usar `result.code` desde `UseCaseResult` | `staff.controller.ts`, `service.controller.ts`, `auth.controller.ts` |
| 3.5 | Estandarizar controllers con Patrón A | Feature, Log, Appointment (getById, cancel), Staff (getMe, assignService, syncServices) | 4 controllers |
| 3.6 | Eliminar `WhatsAppConfigController` bypass | Usar UseCaseResult + Presenter | `whatsapp-config.controller.ts` |
| 3.7 | Mover orphan use case | `core/use-cases/order/get-order-stats.use-case.ts` → `core/application/order/` | Mover archivo |

**Resultado de Fase 3:** Un solo patrón de retorno. Todos los use cases retornan `UseCaseResult`. Todos los controllers usan el mismo patrón.

---

### Fase 4: Mejoras en Repositories (Prisma `select`)

**Objetivo:** Reducir el over-fetching en la capa de datos, complementando los Response DTOs. Si Prisma trae menos datos, la API es más eficiente y los DTOs validan contra menos riesgo.

**Tareas:**

| # | Tarea | Archivo | Detalle |
|---|-------|---------|---------|
| 4.1 | Reemplazar `user: true` con `user: { select }` en appointments | `appointment.prisma-repository.ts` | `select: { id, name, email, phone, profilePic }` en `findAll()`, `findById()` |
| 4.2 | Eliminar spread en `user.mapToEntity()` | `user.prisma-repository.ts:323` | Reemplazar `...userData` con mapeo explícito excluyendo `password`, `resetPasswordToken`, `resetPasswordExpires`, social IDs |
| 4.3 | Agregar `select` a `findByResetToken()` | `user.prisma-repository.ts:237` | Este método es interno — solo necesita `id`, `resetPasswordToken`, `resetPasswordExpires` |
| 4.4 | Limpiar `mapToEntity` en appointments | `appointment.prisma-repository.ts:219-221` | Mapear explícitamente `user`, `staff`, `service` en vez de pasar crudo |

> **NOTA:** Fase 4 es complementaria, no obligatoria. Los Response DTOs ya filtran campos. Pero `select` en Prisma mejora performance (menos data viaja de DB) y agrega una segunda capa de seguridad (defense in depth).

---

## 4. Contrato de Response DTOs por Entidad

### 4.1 Shared DTOs (reutilizables)

```typescript
// UserMinimalResponse — para embeber en appointments, orders, etc.
interface IUserMinimalResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  profilePic?: string | null;
}

// StaffMinimalResponse — para embeber en appointments
interface IStaffMinimalResponse {
  id: string;
  name: string;
  avatar?: string | null;
}

// ServiceMinimalResponse — para embeber en appointments
interface IServiceMinimalResponse {
  id: string;
  name: string;
  duration: number;
  price: number;
}
```

### 4.2 User

```typescript
// UserPublicResponse — para endpoints públicos (profile, auth)
interface IUserPublicResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  profilePic?: string | null;
  active: boolean;
  role?: {
    id: string;
    name: string;
    level: number;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// UserResponse — para admin (incluye tenants list, sin campos sensibles)
interface IUserResponse extends IUserPublicResponse {
  tenants?: Array<{
    tenantId: string;
    roleId: string;
    role?: {
      id: string;
      name: string;
      level: number;
    };
    tenant?: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}
```

### 4.3 Appointment

```typescript
// AppointmentResponse — detalle completo
interface IAppointmentResponse {
  id: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string | null;
  discountAmount: number;
  subtotal: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  user?: IUserMinimalResponse;
  staff?: IStaffMinimalResponse;
  service?: IServiceMinimalResponse;
}

// AppointmentListResponse — para listas (más ligero)
interface IAppointmentListResponse {
  id: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes?: string;
  total: number;
  user?: IUserMinimalResponse;
  staff?: IStaffMinimalResponse;
  service?: IServiceMinimalResponse;
}
```

### 4.4 Order

```typescript
// OrderResponse
interface IOrderResponse {
  id: string;
  status: OrderStatus;
  trackingNumber?: string | null;
  subtotal: number;
  total: number;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: { name: string; email: string };
  items: Array<{
    id: string;
    productId: string;
    amount: number;
    price: number;
    product?: {
      id: string;
      name: string;
      image?: string | null;
      price: number;
    };
  }>;
}
```

### 4.5 Staff

```typescript
// StaffResponse
interface IStaffResponse {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  active: boolean;
  workingHours?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.6 WhatsAppConfig

```typescript
// WhatsAppConfigResponse
interface IWhatsAppConfigResponse {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;        // Siempre '********' en GET, nunca en POST response
  webhookVerifyToken: string; // Siempre '********' en GET, nunca en POST response
  enabled: boolean;
  notificationsEnabled: boolean;
  botEnabled: boolean;
  templates?: Record<string, any> | null;
  botConfig?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.7 Resto de entidades (sin cambios significativos)

Las siguientes entidades no exponen datos sensibles, pero igual necesitan Response DTOs para:
- Eliminar campos internos (`tenantId` donde no sea necesario para el cliente)
- Contrato explícito (protección ante cambios en schema Prisma)
- Preparar para OpenAPI/Zod en la siguiente fase

| Entidad | Campos a excluir del response |
|---------|-------------------------------|
| Service | `tenantId`, `categoryId` (si se incluye category embebida) |
| Product | `ownerId` (si no es necesario para el cliente), `tenantId` |
| Category | `tenantId` |
| Coupon | `tenantId` |
| Banner | `tenantId` |
| Slide | `tenantId` |
| Role | `tenantId` |
| Permission | `tenantId` |
| Tenant | N/A — todos los campos son de dominio |
| Cart | `userId` (si se infiere del contexto auth) |
| Feature | N/A — no tiene tenantId |

---

## 5. Cambios en `UseCaseResult`

### 5.1 Estado actual

```typescript
export interface UseCaseResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ code: ErrorCode; message: string; field?: string; }>;
}
```

### 5.2 Propuesto

```typescript
export interface UseCaseResult<T = any> {
  success: boolean;
  code?: number;        // HTTP status code — para que controllers no adivinen
  message: string;
  data?: T;
  errors?: Array<{ code: ErrorCode; message: string; field?: string; }>;
  pagination?: {        // Para endpoints paginados
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const Success = <T>(data?: T, message: string = '', code?: number): UseCaseResult<T> => ({
  success: true,
  code: code ?? 200,
  message,
  data,
});

export const Failure = <T>(
  message: string,
  errors?: Array<{ code: ErrorCode; message: string; field?: string }>,
  code: number = 400
): UseCaseResult<T> => ({
  success: false,
  code,
  message,
  errors,
});
```

---

## 6. No incluido en este plan (futuro)

| Tema | Razón | Fase futura |
|------|-------|-------------|
| **Zod schemas + OpenAPI** | Requiere Response DTOs estables primero | Fase 5 |
| **Input DTOs unificados** | Actualmente duplicados entre `entity.ts` y `request-dto.d.ts` | Fase 5 |
| **Migrar `request-dto.d.ts` a `.ts`** | Archivo `.d.ts` con decoradores runtime es incorrecto | Fase 5 |
| **`class-validator` → Zod** | Migración de validación de input | Fase 5 |
| **Repository `select` optimization** | Complemento de performance, no bloqueante | Fase 4 |

---

## 7. Orden de ejecución sugerido

```
Fase 1 (URGENTE): ~13 tareas → Security hotfix
    ↓
Fase 3.1-3.2: 2 tareas → UseCaseResult mejorado (necesario para Fase 2)
    ↓
Fase 2: ~39 tareas → Coverage completa de Response DTOs
    ↓
Fase 3.3-3.7: 5 tareas → Estandarización de patrones
    ↓
Fase 4: 4 tareas → Optimización de Repositories (opcional pero recomendado)
    ↓
Fase 5 (futuro): Zod + OpenAPI + Input DTOs unificados
```

**Rationale:** Fase 1 cierra las vulnerabilidades críticas. Fase 3.1-3.2 es necesaria antes de Fase 2 porque los controllers necesitan `result.code` para setear HTTP status correctamente. Fase 2 es el trabajo de cobertura. Fase 3 completa la estandarización. Fase 4 es optimización.
