# Opciones de Arquitectura para api-neutra-v2

Este documento visualiza cómo se transformaría tu proyecto actual bajo diferentes patrones de arquitectura.

## 1. Clean Architecture (Recomendada para tu migración)
Enfocada en la independencia de la base de datos. Ideal para tu transición Mongoose -> Prisma.

```text
src/
├── config/                 # Configuración de entorno y DB
├── core/                   # Lógica de negocio pura (Enterprise Business Rules)
│   ├── entities/           # Interfaces/Clases de dominio (ej: Cart, User)
│   └── repositories/       # Interfaces de repositorios (ej: ICartRepository)
├── use-cases/              # Casos de uso de la aplicación (Application Business Rules)
│   ├── auth/               # ej: LoginUser, RegisterUser
│   └── cart/               # ej: AddItemToCart, GetCart
├── infrastructure/         # Implementaciones concretas (Frameworks & Drivers)
│   ├── database/
│   │   ├── prisma/         # Implementación Prisma de repositorios
│   │   └── mongoose/       # Implementación Mongoose (legacy)
│   ├── http/               # Express server, middlewares
│   └── routes/             # Definición de rutas
└── interface-adapters/     # Adaptadores
    └── controllers/        # Reciben request, llaman Use Case, devuelven response
```

### Ejemplo de flujo:
`Ruta (Express)` -> `Controller` -> `Use Case (AddItem)` -> `Repository Interface` -> `Prisma Implementation`

---

## 2. Vertical Slice Architecture (Por Features)
Agrupa todo lo relacionado con una funcionalidad en una sola carpeta.

```text
src/
├── features/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── login.controller.ts
│   │   │   ├── login.handler.ts
│   │   │   └── login.schema.ts
│   │   └── register/
│   ├── cart/
│   │   ├── get-cart/
│   │   │   ├── index.ts       # Endpoint definition
│   │   │   └── handler.ts     # Logic & DB access
│   │   ├── add-item/
│   │   └── clear-cart/
│   └── products/
├── shared/                 # Código compartido
│   ├── database/           # Cliente Prisma
│   ├── middleware/
│   └── utils/
└── app.ts
```

### Ejemplo de flujo:
`Request` -> `features/cart/add-item/index.ts` (Maneja todo: validación, lógica y DB)

---

## 3. Modular Monolith (Por Módulos)
Módulos aislados con límites claros.

```text
src/
├── modules/
│   ├── auth/
│   │   ├── api/            # API pública del módulo (para otros módulos)
│   │   ├── core/           # Lógica interna
│   │   └── infra/          # Rutas y DB específicas de Auth
│   ├── cart/
│   │   ├── dtos/
│   │   ├── models/
│   │   ├── services/
│   │   └── cart.module.ts  # Exporta lo necesario
│   └── catalog/            # (Productos)
├── common/                 # Utilidades transversales
└── app.ts                  # Carga y orquesta los módulos
```

---

## Comparativa para tu caso

| Característica | Estructura Actual (Mejorada) | Clean Architecture | Vertical Slice |
| :--- | :--- | :--- | :--- |
| **Separación DB** | Media (con Repositorios) | **Alta** (Interfaces estrictas) | Baja (Queries en handlers) |
| **Complejidad** | Baja | Alta | Media |
| **Velocidad Dev** | Alta | Media | **Muy Alta** |
| **Migración** | Buena | **Excelente** | Requiere refactor masivo |

### Recomendación: "Pragmatic Clean Architecture"
No necesitas la complejidad total de Clean Architecture. Una versión simplificada basada en **Capas + Repositorios** es el mejor balance ahora mismo:

```text
src/
├── controllers/    # Maneja HTTP (req/res)
├── services/       # Lógica de negocio (Casos de uso simplificados)
├── repositories/   # Acceso a datos (Prisma/Mongoose)
├── models/         # Tipos de datos
└── routes/         # Rutas Express
```
