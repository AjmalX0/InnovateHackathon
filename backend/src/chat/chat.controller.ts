import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── POST /chat/message ─────────────────────────────────────
  @Post('message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a chat message (text / voice / document)',
    description:
      'Accepts student input, attaches grade & language context, and routes it to the AI pipeline. ' +
      'Returns a stub AI response in Step 1; real LangGraph response in Step 3.',
  })
  @ApiCreatedResponse({ description: 'Message processed, AI response queued.' })
  sendMessage(@Body() dto: SendMessageDto) {
    return this.chatService.processMessage(dto);
  }

  // ── GET /chat/session/:sessionId ───────────────────────────
  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get session history',
    description: 'Returns all messages sent in a conversation session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiOkResponse({ description: 'Array of chat messages in session.' })
  getSession(@Param('sessionId') sessionId: string) {
    return this.chatService.getSession(sessionId);
  }
}
