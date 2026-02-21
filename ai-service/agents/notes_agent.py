from langchain_google_genai import ChatGoogleGenerativeAI
import json, re

class NotesAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.2)

    async def extract(self, state: dict) -> dict:
        response = state.get("response", "")
        grade    = state.get("grade", 8)
        language = state.get("language", "english")

        if grade < 5:
            # No notes for Cub mode
            return {**state, "key_points": []}

        prompt = f"""From this tutor explanation, extract 3-5 key learning points.
Return ONLY a JSON array of strings. No extra text.
Keep points concise. Language should match: {language}

Explanation: {response}

Return format: ["point 1", "point 2", "point 3"]"""

        result = await self.llm.ainvoke(prompt)
        try:
            # Clean and parse JSON
            clean = re.sub(r'```json|```', '', result.content).strip()
            key_points = json.loads(clean)
        except:
            key_points = []

        return {**state, "key_points": key_points}
