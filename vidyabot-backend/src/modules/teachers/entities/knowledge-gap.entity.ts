export enum ProficiencyLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export class KnowledgeGap {
    id: string;
    student_id: string;
    topic_or_concept: string;
    proficiency_level: ProficiencyLevel;
    last_updated: Date;
}
