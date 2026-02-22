import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    private readonly logger;
    constructor(chatService: ChatService);
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(dto: SendMessageDto, client: Socket): Promise<import("./chat.service").ChatResponse>;
    broadcastToSession(sessionId: string, event: string, payload: unknown): void;
    handleJoinSession(data: {
        sessionId: string;
    }, client: Socket): {
        joined: string;
    };
}
