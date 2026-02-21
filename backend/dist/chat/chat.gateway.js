"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const ai_service_1 = require("../ai/ai.service");
const students_service_1 = require("../students/students.service");
let ChatGateway = class ChatGateway {
    aiService;
    studentsService;
    server;
    constructor(aiService, studentsService) {
        this.aiService = aiService;
        this.studentsService = studentsService;
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    async handleMessage(data, client) {
        try {
            const response = await this.aiService.chat({
                message: data.message,
                student_id: data.studentId,
                grade: data.grade,
                language: data.language,
                session_history: data.sessionHistory,
            });
            await this.studentsService.saveMessage(data.studentId, {
                role: 'user',
                content: data.message,
                language: data.language,
            });
            client.emit('response', {
                response: response.response,
                keyPoints: response.key_points,
                shouldQuiz: response.should_quiz,
                bloomLevel: response.bloom_level,
                detectedConfusion: response.detected_confusion,
                language: response.language,
            });
            if (response.should_quiz) {
                client.emit('quiz_trigger', { studentId: data.studentId });
            }
        }
        catch (error) {
            client.emit('error', { message: 'AI service unavailable' });
        }
    }
    handleTyping(client) {
        client.broadcast.emit('peer_typing');
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' }, namespace: '/chat' }),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        students_service_1.StudentsService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map