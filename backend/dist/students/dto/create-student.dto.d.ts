export declare enum Grade {
    CLASS_1 = 1,
    CLASS_2 = 2,
    CLASS_3 = 3,
    CLASS_4 = 4,
    CLASS_5 = 5,
    CLASS_6 = 6,
    CLASS_7 = 7,
    CLASS_8 = 8,
    CLASS_9 = 9,
    CLASS_10 = 10,
    CLASS_11 = 11,
    CLASS_12 = 12
}
export declare enum Language {
    MALAYALAM = "ml",
    ENGLISH = "en",
    MANGLISH = "mng"
}
export declare class CreateStudentDto {
    name: string;
    grade: number;
    language: Language;
    district?: string;
    learningNeeds?: string[];
}
