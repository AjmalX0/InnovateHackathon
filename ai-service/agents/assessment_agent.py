from langchain_google_genai import ChatGoogleGenerativeAI
import json, re

class AssessmentAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.5)

    async def should_quiz(self, state: dict) -> dict:
        history = state.get("session_history", [])
        # Trigger quiz every 5 exchanges
        should = len([m for m in history if m["role"] == "assistant"]) % 5 == 0
        return {**state, "should_quiz": should}

    async def generate_from_notes(self, note_content: str, grade: int, profile: dict):
        weak_areas = profile.get("weak_areas", [])
        language   = profile.get("language", "english")

        prompt = f"""Generate exactly 5 quiz questions from these notes for a Class {grade} student.
Student weak areas to focus on: {weak_areas}
Language: {language}

Notes: {note_content}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": "A",
      "explanation": "..."
    }}
  ]
}}"""

        result = await self.llm.ainvoke(prompt)
        try:
            clean = re.sub(r'```json|```', '', result.content).strip()
            return json.loads(clean)
        except:
            return {"questions": []}
