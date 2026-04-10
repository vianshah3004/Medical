import os
from unified_medical_api.config import GROQ_API_KEY
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
from duckduckgo_search import DDGS

router = APIRouter(prefix="/treatment_plan", tags=["reports"])

class TreatmentPlanRequest(BaseModel):
    disease: str
    predicted_class: str
    confidence: float
    doctor_notes: str = ""

@router.post("/generate")
async def generate_treatment_plan(request: TreatmentPlanRequest):
    groq_api_key = GROQ_API_KEY
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured in the backend environment.")

    # 1. Search the web using DuckDuckGo for proper treatment plans
    search_query = f"Medical treatment plan guidelines for {request.predicted_class} {request.disease}"
    try:
        ddgs = DDGS()
        results = list(ddgs.text(search_query, max_results=3))
        search_context = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
    except Exception as e:
        # Fallback if DDGS fails
        search_context = f"Web search could not be completed at this time."

    # 2. Call Groq
    try:
        client = Groq(api_key=groq_api_key)
        
        system_prompt = (
            "You are an expert AI medical assistant. Your task is to draft a comprehensive "
            "but concise medical treatment plan based on the provided diagnosis. "
            "Include recommended next steps, any necessary lifestyle changes, "
            "and standard medical protocol. "
            "Address whether intervention is needed or not. "
            "Use the provided web search context as a reference for up-to-date guidelines. "
            "Format your response neatly using Markdown or clear paragraphs. "
            "End with a disclaimer stating that this is an AI generated plan and needs physician verification."
        )
        
        user_prompt = f"""
Diagnosis Category: {request.disease}
Predicted Condition: {request.predicted_class}
AI Confidence: {request.confidence}%
Doctor Notes Context: {request.doctor_notes if request.doctor_notes else 'None'}

Recent Web Search Context:
{search_context}

Based on this information, provide a professional AI Treatment Plan. 
Is immediate treatment needed? What should be done?
"""
        model = "llama-3.1-8b-instant" 
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
            model=model,
            temperature=0.3,
        )

        response_content = chat_completion.choices[0].message.content
        return {"treatment_plan": response_content}

    except Exception as e:
        print(f"Groq API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment plan using Groq: {str(e)}")
