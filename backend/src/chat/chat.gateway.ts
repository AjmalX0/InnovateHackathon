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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * ChatGateway — WebSocket interface for real-time chat.
 *
 * Clients (Flutter) connect and emit:
 *   'chat:message' → SendMessageDto
 *
 * Server emits back:
 *   'chat:response'   → ChatResponse (streamed tokens in Step 3)
 *   'chat:error'      → { message: string }
 *   'chat:connected'  → { clientId: string }
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  afterInit() {
    this.logger.log('WebSocket ChatGateway initialised on /chat');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('chat:connected', { clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Event: 'chat:message' ──────────────────────────────────
  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const response = await this.chatService.processMessage(dto);
      // Emit response back to the originating client only
      client.emit('chat:response', response);
      return response; // also returned as ACK
    } catch (err) {
      this.logger.error(`Error processing message: ${err.message}`);
      client.emit('chat:error', { message: err.message });
    }
  }

  /**
   * Broadcast helper — used by Step 3 (Orchestrator) to push
   * streamed tokens to all clients in a session room.
   */
  broadcastToSession(sessionId: string, event: string, payload: unknown) {
    this.server.to(sessionId).emit(event, payload);
  }

  // ── Event: 'chat:join-session' ─────────────────────────────
  @SubscribeMessage('chat:join-session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.sessionId);
    this.logger.log(`Client ${client.id} joined session ${data.sessionId}`);
    return { joined: data.sessionId };
  }
}
