```
vidyabot/
├── mobile/                    ← Flutter app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app/
│   │   │   ├── routes.dart
│   │   │   └── theme.dart
│   │   ├── core/
│   │   │   ├── constants.dart
│   │   │   ├── network/
│   │   │   │   ├── api_client.dart
│   │   │   │   └── websocket_service.dart
│   │   │   ├── offline/
│   │   │   │   ├── offline_manager.dart
│   │   │   │   ├── gemma_service.dart
│   │   │   │   ├── whisper_service.dart
│   │   │   │   └── tts_service.dart
│   │   │   └── storage/
│   │   │       ├── database.dart
│   │   │       └── sync_service.dart
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart
│   │   │   │   └── grade_selection_screen.dart
│   │   │   ├── chat/
│   │   │   │   ├── chat_screen.dart
│   │   │   │   ├── chat_bloc.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── message_bubble.dart
│   │   │   │       ├── voice_button.dart
│   │   │   │       └── online_indicator.dart
│   │   │   ├── notes/
│   │   │   │   ├── notes_panel.dart
│   │   │   │   ├── notes_bloc.dart
│   │   │   │   └── doc_upload_widget.dart
│   │   │   ├── quiz/
│   │   │   │   └── quiz_screen.dart
│   │   │   ├── dashboard/        ← teacher view
│   │   │   │   └── teacher_dashboard.dart
│   │   │   └── profile/
│   │   │       └── student_profile.dart
│   │   └── models/
│   │       ├── student.dart
│   │       ├── message.dart
│   │       └── note.dart
│   ├── pubspec.yaml
│   └── assets/
│       └── models/              ← whisper model stored here
│
├── backend/                   ← NestJS
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   └── supabase.strategy.ts
│   │   ├── chat/
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.gateway.ts      ← WebSocket
│   │   │   └── chat.service.ts
│   │   ├── students/
│   │   │   ├── students.module.ts
│   │   │   └── students.service.ts
│   │   ├── notes/
│   │   │   ├── notes.module.ts
│   │   │   └── notes.service.ts
│   │   ├── teacher/
│   │   │   ├── teacher.module.ts
│   │   │   └── teacher.service.ts
│   │   ├── ai/
│   │   │   ├── ai.module.ts
│   │   │   └── ai.service.ts        ← calls Python service
│   │   └── notifications/
│   │       └── notifications.service.ts
│   └── package.json
│
└── ai-service/                ← Python LangGraph
    ├── main.py                ← FastAPI entrypoint
    ├── agents/
    │   ├── orchestrator.py
    │   ├── pedagogy_agent.py
    │   ├── content_agent.py
    │   ├── notes_agent.py
    │   ├── assessment_agent.py
    │   ├── memory_agent.py
    │   └── alert_agent.py
    ├── rag/
    │   ├── vectorstore.py
    │   └── ingest.py
    ├── models/
    │   └── schemas.py
    └── requirements.txt
