from __future__ import annotations

import base64
import json
import logging
from typing import Any

from groq import AsyncGroq
from unified_medical_api.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

class AIInsightService:
    def __init__(self):
        if not GROQ_API_KEY:
            logger.warning("GROQ_API_KEY is not set. Groq features will be disabled.")
        self.client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

    async def generate_insights(
        self,
        scan_type: str,
        model_output: dict[str, Any],
        image_bytes: bytes | None = None,
        retries: int = 3
    ) -> dict[str, Any]:
        if not self.client:
            return {"error": "Groq client not configured"}

        system_prompt = "You are an expert radiologist AI assistant. Analyze scan data and model outputs to provide clinically useful insights."
        
        user_prompt = f"""
Scan Type: {scan_type}
Model Output:
{json.dumps(model_output, indent=2)}

Instructions:
- Summarize key findings
- Highlight abnormalities
- Provide possible interpretations
- Avoid hallucination
- Be concise and structured
"""

        content = [{"type": "text", "text": user_prompt}]
        
        if image_bytes:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            })

        for attempt in range(retries):
            try:
                response = await self.client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content}
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=1024
                )
                
                result_text = response.choices[0].message.content
                return json.loads(result_text)
            except Exception as e:
                logger.error(f"Groq API error (attempt {attempt+1}/{retries}): {e}")
                if attempt == retries - 1:
                    return {"error": f"Failed to generate insights after {retries} attempts: {str(e)}"}
        
        return {"error": "Unexpected state in generate_insights"}

ai_insight_service = AIInsightService()

def get_ai_insight_service() -> AIInsightService:
    return ai_insight_service
