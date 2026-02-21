from supabase import create_client
import os, json

class MemoryAgent:
    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )

    async def load(self, state: dict) -> dict:
        student_id = state.get("student_id")
        try:
            result = self.supabase.table("student_profiles")\
                .select("*").eq("id", student_id).single().execute()
            profile = result.data or {}
        except:
            profile = {}
        return {**state, "student_profile": profile}

    async def save(self, state: dict) -> dict:
        student_id = state.get("student_id")
        response   = state.get("response", "")
        confusion  = state.get("confusion_detected", False)

        # Update confusion count in profile
        if confusion:
            self.supabase.rpc("increment_confusion", {"sid": student_id}).execute()

        # Save session message
        self.supabase.table("session_messages").insert({
            "student_id": student_id,
            "role": "assistant",
            "content": response,
            "grade": state.get("grade"),
        }).execute()

        return state

    async def get_profile(self, student_id: str):
        try:
            result = self.supabase.table("student_profiles")\
                .select("*").eq("id", student_id).single().execute()
            return result.data or {}
        except:
            return {}
