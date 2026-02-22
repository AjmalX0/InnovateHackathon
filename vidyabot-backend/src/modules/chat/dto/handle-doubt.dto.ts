import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export enum InputTypeDto {
    VOICE = 'voice',
    TEXT = 'text',
}

export class HandleDoubtDto {
    @IsUUID()
    studentId: string;

    @IsString()
    chapter: string;

    @IsString()
    subject: string;

    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsString()
    audioBase64?: string;

    @IsEnum(InputTypeDto)
    inputType: InputTypeDto;
}
