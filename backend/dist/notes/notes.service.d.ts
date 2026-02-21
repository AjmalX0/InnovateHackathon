export declare class NotesService {
    private supabase;
    saveNote(studentId: string, note: {
        title: string;
        content: string;
        subject: string;
        grade: number;
        keyPoints: string[];
        source: 'chat' | 'upload' | 'voice';
    }): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<null>>;
    getStudentNotes(studentId: string): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any[]>>;
    shareNote(noteId: string): Promise<{
        shareToken: string;
    }>;
    getNoteByShareToken(token: string): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<{
        title: any;
        content: any;
        key_points: any;
        subject: any;
    }>>;
}
