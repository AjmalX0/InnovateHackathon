import { Injectable, Logger } from '@nestjs/common';
import { Message } from '../chat/entities/message.entity';
import { CapabilityCluster } from '../../common/enums/capability-cluster.enum';

const CONFUSION_KEYWORDS = [
    'മനസ്സിലായില്ല',
    'അറിയില്ല',
    'confused',
    "don't understand",
    'dont understand',
    'again',
    'repeat',
    'what',
    'why',
];

const CORRECT_INDICATORS = [
    'മനസ്സിലായി',
    'okay',
    'ok',
    'understood',
    'got it',
    'clear',
    'i see',
    'yes',
    'correct',
    'right',
];

@Injectable()
export class CapabilityService {
    private readonly logger = new Logger(CapabilityService.name);

    computeScore(messages: Message[]): number {
        const recentMessages = messages.slice(-20);
        let score = 70;

        for (const message of recentMessages) {
            if (message.role !== 'student') continue;
            const text = message.content.toLowerCase();

            for (const keyword of CONFUSION_KEYWORDS) {
                if (text.includes(keyword.toLowerCase())) {
                    score -= 5;
                    break; // one penalty per message
                }
            }

            for (const indicator of CORRECT_INDICATORS) {
                if (text.includes(indicator.toLowerCase())) {
                    score += 5;
                    break; // one reward per message
                }
            }
        }

        const clamped = Math.min(100, Math.max(0, score));
        this.logger.debug(`Computed capability score: ${clamped} from ${recentMessages.length} messages`);
        return clamped;
    }

    getCluster(score: number): CapabilityCluster {
        if (score <= 30) return CapabilityCluster.LOW;
        if (score <= 70) return CapabilityCluster.MEDIUM;
        return CapabilityCluster.HIGH;
    }

    getClusterFromMessages(messages: Message[]): CapabilityCluster {
        const score = this.computeScore(messages);
        return this.getCluster(score);
    }
}
