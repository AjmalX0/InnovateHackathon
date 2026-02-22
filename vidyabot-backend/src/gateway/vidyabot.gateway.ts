import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TeachingService } from '../modules/teaching/teaching.service';
import { ChatService } from '../modules/chat/chat.service';
import { IsString, IsUUID, IsEnum, IsOptional, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

class StartLearningPayload {
    @IsUUID()
    studentId: string;

    @IsString()
    subject: string;

    @IsString()
    chapter: string;
}

class AskDoubtPayload {
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

    @IsEnum(['voice', 'text'])
    inputType: 'voice' | 'text';
}

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    namespace: '/',
})
export class VidyabotGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(VidyabotGateway.name);

    constructor(
        private readonly teachingService: TeachingService,
        private readonly chatService: ChatService,
    ) { }

    afterInit(): void {
        this.logger.log('WebSocket Gateway initialized');
    }

    handleConnection(client: Socket): void {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('start_learning')
    async handleStartLearning(
        @MessageBody() data: StartLearningPayload,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const payload = plainToInstance(StartLearningPayload, data);
        const errors = validateSync(payload);

        if (errors.length > 0) {
            client.emit('error', {
                event: 'start_learning',
                message: 'Invalid payload',
                details: errors.map((e) => Object.values(e.constraints ?? {})).flat(),
            });
            return;
        }

        try {
            this.logger.log(
                `[start_learning] studentId=${payload.studentId}, subject=${payload.subject}, chapter=${payload.chapter}`,
            );

            const result = await this.teachingService.startTeachingSession(
                payload.studentId,
                payload.subject,
                payload.chapter,
            );

            client.emit('lesson_started', {
                blockId: result.block.id,
                fromCache: result.fromCache,
                content: result.content,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`[start_learning] Error: ${err.message}`);
            client.emit('error', {
                event: 'start_learning',
                message: err.message,
            });
        }
    }

    @SubscribeMessage('ask_doubt')
    async handleAskDoubt(
        @MessageBody() data: AskDoubtPayload,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const payload = plainToInstance(AskDoubtPayload, data);
        const errors = validateSync(payload);

        if (errors.length > 0) {
            client.emit('error', {
                event: 'ask_doubt',
                message: 'Invalid payload',
                details: errors.map((e) => Object.values(e.constraints ?? {})).flat(),
            });
            return;
        }

        try {
            this.logger.log(
                `[ask_doubt] studentId=${payload.studentId}, chapter=${payload.chapter}, inputType=${payload.inputType}`,
            );

            const result = await this.chatService.handleDoubt(
                payload.studentId,
                payload.subject,
                payload.chapter,
                payload.inputType,
                payload.text,
                payload.audioBase64,
            );

            client.emit('doubt_answered', {
                messageId: result.messageId,
                fromCache: result.fromCache,
                response: result.response,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`[ask_doubt] Error: ${err.message}`);
            client.emit('error', {
                event: 'ask_doubt',
                message: err.message,
            });
        }
    }
}
