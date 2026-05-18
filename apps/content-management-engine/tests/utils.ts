/**
 * Testing utility helpers and database fixtures for CMS Monolith integration tests.
 * Satisfies T003.
 */

export async function createMockTenant(payload: any, name: string, hostname: string) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return await payload.create({
    collection: 'tenants',
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${uniqueId}`,
      domains: [
        { hostname, isPrimary: true }
      ]
    }
  });
}

export async function createMockUser(payload: any, email: string, role: string, tenantId?: any) {
  const tenants = tenantId ? [{ tenant: tenantId }] : [];
  return await payload.create({
    collection: 'users',
    data: {
      email,
      password: 'test-password-123',
      role,
      tenants,
    }
  });
}

export async function clearCollection(payload: any, collection: string) {
  const items = await payload.find({
    collection,
    limit: 100,
    overrideAccess: true,
  });

  for (const item of items.docs) {
    await payload.delete({
      collection,
      id: item.id,
      overrideAccess: true,
    });
  }
}
