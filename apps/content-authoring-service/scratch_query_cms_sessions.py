import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/hermes_cms')
    
    async with engine.connect() as conn:
        try:
            print("Querying drafting_sessions...")
            res = await conn.execute(text("SELECT id, status, tenant_id, content_type_id, draft_data, created_at FROM drafting_sessions ORDER BY created_at DESC LIMIT 5;"))
            rows = res.fetchall()
            for r in rows:
                print(f"\nSession ID: {r[0]}, Status: {r[1]}, Tenant: {r[2]}, ContentType: {r[3]}, Created: {r[5]}")
                print(f"Draft Data: {r[4]}")
        except Exception as e:
            print(f"Error querying drafting_sessions: {e}")

if __name__ == "__main__":
    asyncio.run(main())
