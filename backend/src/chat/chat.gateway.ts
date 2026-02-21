import {
    WebSocketGateway, WebSocketServer,
    SubscribeMessage, MessageBody,
    ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AiService } from '../ai/ai.service';
import { StudentsService } from '../students/students.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(
        private aiService: AiService,
        private studentsService: StudentsService,
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('message')
    async handleMessage(
        @MessageBody() data: {
            message: string;
            studentId: string;
            grade: number;
            language: string;
            sessionHistory: any[];
        },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Send to Python AI service
            const response = await this.aiService.chat({
                message: data.message,
                student_id: data.studentId,
                grade: data.grade,
                language: data.language,
                session_history: data.sessionHistory,
            });

            // Save to Supabase
            await this.studentsService.saveMessage(data.studentId, {
                role: 'user',
                content: data.message,
                language: data.language,
            });

            // Emit response back to this specific client
            client.emit('response', {
                response: response.response,
                keyPoints: response.key_points,
                shouldQuiz: response.should_quiz,
                bloomLevel: response.bloom_level,
                detectedConfusion: response.detected_confusion,
                language: response.language,
            });

            // If quiz should trigger, emit quiz event
            if (response.should_quiz) {
                client.emit('quiz_trigger', { studentId: data.studentId });
            }

        } catch (error) {
            client.emit('error', { message: 'AI service unavailable' });
        }
    }

    @SubscribeMessage('typing')
    handleTyping(@ConnectedSocket() client: Socket) {
        client.broadcast.emit('peer_typing');
    }
}
