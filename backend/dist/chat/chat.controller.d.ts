import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendMessage(dto: SendMessageDto): Promise<import("./chat.service").ChatResponse>;
    getSession(sessionId: string): Promise<import("./chat.service").ChatMessage[]>;
}
