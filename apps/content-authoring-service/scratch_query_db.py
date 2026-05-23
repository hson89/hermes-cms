import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    # Connect to hermes_cms
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/hermes_cms')
    
    async with engine.connect() as conn:
        try:
            print("Querying ai_audit_logs...")
            res = await conn.execute(text("SELECT id, request_type, prompt, status, error_message, created_at FROM ai_audit_logs ORDER BY created_at DESC LIMIT 5;"))
            rows = res.fetchall()
            for r in rows:
                print(f"ID: {r[0]}, TYPE: {r[1]}, PROMPT: {r[2]}, STATUS: {r[3]}, ERROR: {r[4]}, TIME: {r[5]}")
        except Exception as e:
            print(f"Error querying ai_audit_logs: {e}")
            
        try:
            print("\nQuerying drafting_sessions...")
            res = await conn.execute(text("SELECT id, status, tenant_id, content_type_id, draft_data, created_at FROM drafting_sessions ORDER BY created_at DESC LIMIT 3;"))
            rows = res.fetchall()
            for r in rows:
                print(f"ID: {r[0]}, STATUS: {r[1]}, TENANT: {r[2]}, CT: {r[3]}, DATA: {str(r[4])[:200]}, TIME: {r[5]}")
        except Exception as e:
            print(f"Error querying drafting_sessions: {e}")

if __name__ == "__main__":
    asyncio.run(main())
