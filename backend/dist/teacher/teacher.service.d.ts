export declare class TeacherService {
    private supabase;
    getClassProgress(teacherId: string): Promise<{
        students: {
            id: any;
            name: any;
            grade: any;
        }[] | null;
        progress: any[] | null;
    }>;
    getWeakAreaHeatmap(teacherId: string): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any>>;
    getStudentAlerts(teacherId: string): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any[]>>;
}
