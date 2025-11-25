# API Endpoints - Required Permissions

This document lists all API endpoints and their required permissions under the RBAC system.

## Users API (`/api/users`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|-------------|
| GET | `/` | `users:read` | Get all users list |
| GET | `/find/:id` | `users:read` | Get user by ID |
| GET | `/stats` | `stats:read` | Get user statistics |

**Roles with access:**
- `users:read`: MANAGER, ADMIN
- `stats:read`: MANAGER, ADMIN

---

## Products API (`/api/products`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|-------------|
| GET | `/` | *Public* | Get all products |
| GET | `/:id` | *Public* | Get product by ID |
| GET | `/one/:id` | *Public* | Get product by ID (alias) |
| POST | `/search` | *Public* | Search products |
| POST | `/` | `products:write` | Create new product |
| PUT | `/:id` | `products:write` | Update product |
| DELETE | `/:id` | `products:delete` | Delete product |
| GET | `/stats` | `stats:read` | Get product statistics |

**Roles with access:**
- `products:write`: MANAGER, ADMIN
- `products:delete`: ADMIN only
- `stats:read`: MANAGER, ADMIN

---

## Permission Matrix

| Permission | USER | MANAGER | ADMIN |
|------------|------|---------|-------|
| `users:read` | ❌ | ✅ | ✅ |
| `users:write` | ❌ | ❌ | ✅ |
| `users:delete` | ❌ | ❌ | ✅ |
| `users:manage` | ❌ | ❌ | ✅ |
| `products:read` | ✅ | ✅ | ✅ |
| `products:write` | ❌ | ✅ | ✅ |
| `products:delete` | ❌ | ❌ | ✅ |
| `orders:read` | ✅ | ✅ | ✅ |
| `orders:write` | ✅ | ✅ | ✅ |
| `orders:manage` | ❌ | ✅ | ✅ |
| `stats:read` | ❌ | ✅ | ✅ |
| `slides:write` | ❌ | ❌ | ✅ |

---

## Migration Notes

### Before (Numeric Roles)
```typescript
router.get('/users', authValidation(2), controller.getAll);
// 1 = USER, 2 = ADMIN
```

### After (Permission-Based)
```typescript
router.get('/users', authenticate, requirePermission('users:read'), controller.getAll);
```

### Benefits
- ✅ Self-documenting code
- ✅ Granular control (different permissions for read/write/delete)
- ✅ Easy to extend without code changes
- ✅ Frontend can check permissions from JWT

---

## Testing Permissions

To test different permission levels:

1. **Login as different users** to get different role tokens
2. **Check JWT payload** - should contain `role.permissions` array
3. **Test unauthorized access** - should return `403 Forbidden` with permission error
4. **Test unauthenticated access** - should return `401 Unauthorized`

Example JWT payload:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": {
    "id": "role-id",
    "name": "MANAGER",
    "level": 5,
    "permissions": ["products:read", "products:write", "orders:manage", "stats:read", "users:read"]
  }
}
```
