import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

async def main():
    # Connect to hermes_authoring
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5433/hermes_authoring')
    
    async with engine.connect() as conn:
        try:
            print("Querying ai_agent_sessions...")
            res = await conn.execute(text("SELECT id, tenant_id, user_id, context, created_at FROM ai_agent_sessions ORDER BY created_at DESC LIMIT 5;"))
            rows = res.fetchall()
            for r in rows:
                print(f"\nSession ID: {r[0]}, Tenant: {r[1]}, User: {r[2]}, Created: {r[4]}")
                # Parse context if it's a JSON string or already list
                context = r[3]
                if isinstance(context, str):
                    try:
                        context = json.loads(context)
                    except:
                        pass
                print("Context:")
                for msg in context:
                    role = msg.get('role') or msg.get('type')
                    content = msg.get('content')
                    print(f"  [{role}]: {str(content)[:300]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
