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
import { CapabilityService } from '../modules/capability/capability.service';
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

class SimplifyPayload {
    @IsUUID()
    studentId: string;

    @IsString()
    subject: string;

    @IsString()
    chapter: string;
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
        private readonly capabilityService: CapabilityService,
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

    /**
     * Emitted by frontend when the student taps the "Simplify" button.
     *
     * Flow:
     *  1. Record penalty in CapabilityService (drops score by 10)
     *  2. Re-run teaching session — cluster may now be lower (HIGH→MEDIUM, MEDIUM→LOW)
     *  3. Emit `lesson_started` back with simplified content
     *
     * Frontend payload: { studentId, subject, chapter }
     */
    @SubscribeMessage('simplify_requested')
    async handleSimplify(
        @MessageBody() data: SimplifyPayload,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const payload = plainToInstance(SimplifyPayload, data);
        const errors = validateSync(payload);

        if (errors.length > 0) {
            client.emit('error', {
                event: 'simplify_requested',
                message: 'Invalid payload',
                details: errors.map((e) => Object.values(e.constraints ?? {})).flat(),
            });
            return;
        }

        try {
            // 1. Record the simplify click — decreases the student's score by SIMPLIFY_PENALTY
            this.capabilityService.recordSimplify(payload.studentId);
            const penalty = this.capabilityService.getSimplifyPenalty(payload.studentId);
            this.logger.log(
                `[simplify_requested] studentId=${payload.studentId} totalPenalty=${penalty}`,
            );

            // 2. Re-run teaching session with the updated (lower) capability score
            const result = await this.teachingService.startTeachingSession(
                payload.studentId,
                payload.subject,
                payload.chapter,
            );

            // 3. Return simplified lesson to client
            client.emit('lesson_started', {
                blockId: result.block.id,
                fromCache: result.fromCache,
                content: result.content,
                simplified: true,
                simplifyPenaltyApplied: penalty,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`[simplify_requested] Error: ${err.message}`);
            client.emit('error', {
                event: 'simplify_requested',
                message: err.message,
            });
        }
    }
}
