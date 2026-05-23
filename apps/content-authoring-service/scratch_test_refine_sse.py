import httpx
import json
import asyncio

async def main():
    url = "http://localhost:8000/api/ai/refine"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": "hermes-internal-secret"
    }
    body = {
        "prompt": "Make it focus heavily on driving smoothly",
        "current_draft_json": {
            "title": "Fuel-Saving Strategies for 2026",
            "excerpt": "Explore practical tips to save fuel",
            "body": "<p>Saving fuel is good.</p>"
        },
        "content_schema": {
            "name": "Article",
            "slug": "article",
            "fields": [
                {"name": "title", "label": "Title", "type": "text", "required": True},
                {"name": "excerpt", "label": "Excerpt", "type": "textarea", "required": False},
                {"name": "body", "label": "Body", "type": "rich-text", "required": True}
            ]
        },
        "tenant_id": "2",
        "user_id": "1",
        "locale": "en"
    }
    
    print("Sending request to Content Authoring Service...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                print(f"Response status: {response.status_code}")
                if response.status_code != 200:
                    print(await response.aread())
                    return
                
                async for line in response.aiter_lines():
                    if line.strip():
                        print(f"SSE line: {line}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
