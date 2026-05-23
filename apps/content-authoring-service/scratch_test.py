import asyncio
import os
import sys
from dotenv import load_dotenv

# Load env variables from the content-authoring-service folder
load_dotenv(".env")

sys.path.append(".")

from src.application.ai_service import AIService
from langchain_core.messages import HumanMessage

async def main():
    ai_service = AIService()
    print("Initializing model...")
    model = ai_service.get_model()
    print(f"Model initialized: {model}")
    
    prompt = "Hello, write a short sentence about fuel."
    print(f"Sending prompt: {prompt}")
    
    # 1. Test ainvoke
    try:
        print("\n--- Test ainvoke ---")
        res = await model.ainvoke([HumanMessage(content=prompt)])
        print(f"Result content: {res.content}")
        print(f"Result raw: {res}")
    except Exception as e:
        print(f"ainvoke error: {e}")
        
    # 2. Test astream
    try:
        print("\n--- Test astream ---")
        async for chunk in model.astream([HumanMessage(content=prompt)]):
            print(f"Chunk content: {repr(chunk.content)}")
            print(f"Chunk additional_kwargs: {chunk.additional_kwargs}")
            if hasattr(chunk, 'response_metadata'):
                print(f"Chunk response_metadata: {chunk.response_metadata}")
            print("-" * 40)
    except Exception as e:
        print(f"astream error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
