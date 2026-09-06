-- Global WhatsApp permissions (tenantId NULL = global)
INSERT INTO "permissions" ("id", "name", "description", "active", "tenantId", "createdAt")
SELECT gen_random_uuid(), 'whatsapp:read', 'Read WhatsApp configuration', true, NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'whatsapp:read');

INSERT INTO "permissions" ("id", "name", "description", "active", "tenantId", "createdAt")
SELECT gen_random_uuid(), 'whatsapp:write', 'Manage WhatsApp configuration and send messages', true, NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'whatsapp:write');

-- Grant to ADMIN and SUPER_ADMIN roles
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."name" IN ('whatsapp:read', 'whatsapp:write')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
