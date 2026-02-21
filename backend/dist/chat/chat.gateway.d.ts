import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AiService } from '../ai/ai.service';
import { StudentsService } from '../students/students.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private aiService;
    private studentsService;
    server: Server;
    constructor(aiService: AiService, studentsService: StudentsService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(data: {
        message: string;
        studentId: string;
        grade: number;
        language: string;
        sessionHistory: any[];
    }, client: Socket): Promise<void>;
    handleTyping(client: Socket): void;
}
