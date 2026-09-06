-- ORDERS and APPOINTMENTS modules are now gated by tenant TYPE, not features.
DELETE FROM "tenant_features" WHERE "featureId" IN (
    SELECT "id" FROM "features" WHERE "key" IN ('ORDERS', 'APPOINTMENTS')
);
DELETE FROM "features" WHERE "key" IN ('ORDERS', 'APPOINTMENTS');
