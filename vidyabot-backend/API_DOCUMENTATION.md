# VidyaBot Backend API & WebSocket Documentation

Base URL: `http://localhost:3000` (or your deployed URL)
WebSocket URL: `ws://localhost:3000` (or your deployed URL)

## REST API Endpoints

### 1. Create Student Profile
Creates a new student profile in the system.

- **URL:** `/students`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "name": "string",
    "grade": 10
  }
  ```
  *(Note: `grade` must be a number between 1 and 12)*

- **Success Response:**
  - **Code:** 201 Created
  - **Content:**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "grade": 10,
      "capability_score": 50,
      "last_active": "2023-10-25T12:00:00.000Z"
    }
    ```

### 2. Get Student Profile
Retrieves an existing student profile by ID.

- **URL:** `/students/:id`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200 OK
  - **Content:**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "grade": 10,
      "capability_score": 50,
      "last_active": "2023-10-25T12:00:00.000Z"
    }
    ```

### 3. Upload Textbook for RAG
Uploads a textbook PDF to be chunked, embedded, and stored into the PostgreSQL vector database for Semantic Search / RAG context.

- **URL:** `/syllabus/upload-textbook`
- **Method:** `POST`
- **Headers:** `Content-Type: multipart/form-data`
- **Body (form-data):**
  - `file`: (File) The PDF file of the syllabus textbook.
  - `grade`: (number) The grade level for this textbook material.
  - `subject`: (string) The subject it corresponds to (e.g., "science").
  - `chapter`: (string) The specific chapter name/number (e.g., "chapter-1").
- **Success Response:**
  - **Code:** 201 Created
  - **Content:**
    ```json
    {
      "message": "Textbook uploaded and processed successfully. Chunks are now available for RAG.",
      "grade": 10,
      "subject": "science",
      "chapter": "chapter-1"
    }
    ```

### 4. Start Teaching Session (HTTP Alternative)
Starts a new teaching session for a student. *Note: You can use this HTTP endpoint or the WebSocket `start_learning` event depending on your frontend architecture.*

- **URL:** `/teaching/session`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "studentId": "uuid",
    "subject": "string",
    "chapter": "string"
  }
  ```
- **Success Response:**
  - **Code:** 200 OK
  - **Content:**
    ```json
    {
      "blockId": "uuid",
      "fromCache": true,
      "content": {
        "introduction": "string",
        "main_explanation": "string",
        "summary": "string",
        "follow_up_question": "string"
      }
    }
    ```

---

## WebSocket Events (Socket.io)

Connect your frontend to the Socket.io server at the root namespace `/`. 

### 1. Start Learning
Initiates a new learning session for a specific subject and chapter.

- **Emit Event:** `start_learning`
- **Payload:**
  ```typescript
  {
    studentId: string; // UUID of the student
    subject: string;
    chapter: string;
  }
  ```
- **Listen For Event:** `lesson_started`
- **Response Payload:**
  ```typescript
  {
    blockId: string; // The generated teaching block ID
    fromCache: boolean; // Whether the response came from the database cache
    content: {
      introduction: string;
      main_explanation: string;
      summary: string; // Typically bullet points or short text
      follow_up_question: string;
    }
  }
  ```

### 2. Ask a Doubt
Submits a student's doubt (either via text or voice) and receives an AI-generated explanation.

- **Emit Event:** `ask_doubt`
- **Payload:**
  ```typescript
  {
    studentId: string; // UUID of the student
    subject: string;
    chapter: string;
    inputType: 'text' | 'voice';
    text?: string; // Required if inputType is 'text'
    audioBase64?: string; // Required if inputType is 'voice' (Base64 audio string without data URI prefix)
  }
  ```
- **Listen For Event:** `doubt_answered`
- **Response Payload:**
  ```typescript
  {
    messageId: string; // The ID of the saved chat message in DB
    fromCache: boolean; // Whether the answer came from the database cache
    response: {
      answer: string; // Direct answer to the student's question
      simple_analogy: string; // Concrete real-world analogy
      encouragement: string; // Short uplifting message
    }
  }
  ```

### Error Handling

If any validation or server error occurs during a WebSocket event (e.g., missing variables or bad payload), the server will emit an `error` event.

- **Listen For Event:** `error`
- **Payload:**
  ```typescript
  {
    event: 'start_learning' | 'ask_doubt'; // The event name that triggered the error
    message: string; // Error description (e.g. "Invalid payload")
    details?: string[]; // Array of specific validation errors (if applicable)
  }
  ```
