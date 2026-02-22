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

/** Score drop each time student clicks "Simplify" */
const SIMPLIFY_PENALTY = 10;

@Injectable()
export class CapabilityService {
    private readonly logger = new Logger(CapabilityService.name);

    /**
     * Tracks how many times each student has clicked "Simplify" this session.
     * Keyed by studentId. Cleared when a new teaching session starts.
     */
    private readonly simplifyPenalties = new Map<string, number>();

    // ─── Simplify button ──────────────────────────────────────────────────────

    /**
     * Called when the student clicks the "Simplify" button.
     * Accumulates a score penalty in memory for the current session.
     */
    recordSimplify(studentId: string): void {
        const current = this.simplifyPenalties.get(studentId) ?? 0;
        this.simplifyPenalties.set(studentId, current + 1);
        this.logger.debug(
            `[Simplify] studentId=${studentId} clicks=${current + 1} totalPenalty=${(current + 1) * SIMPLIFY_PENALTY}`,
        );
    }

    /**
     * Returns the total score penalty accumulated from simplify clicks.
     */
    getSimplifyPenalty(studentId: string): number {
        return (this.simplifyPenalties.get(studentId) ?? 0) * SIMPLIFY_PENALTY;
    }

    /**
     * Resets simplify click count for a student.
     * Call this when a new teaching session starts.
     */
    clearSession(studentId: string): void {
        this.simplifyPenalties.delete(studentId);
        this.logger.debug(`[Simplify] Session cleared for studentId=${studentId}`);
    }

    // ─── Score computation ────────────────────────────────────────────────────

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
        }

        const clamped = Math.min(100, Math.max(0, score));
        this.logger.debug(`Computed capability score: ${clamped} from ${recentMessages.length} messages`);
        return clamped;
    }

    /**
     * Like computeScore() but also applies any accumulated simplify penalties
     * for the given student. Use this instead of computeScore() wherever
     * studentId is available.
     */
    computeScoreForStudent(studentId: string, messages: Message[]): number {
        const base = this.computeScore(messages);
        const penalty = this.getSimplifyPenalty(studentId);
        const adjusted = Math.max(0, base - penalty);
        if (penalty > 0) {
            this.logger.debug(
                `[Simplify] base=${base} simplifyPenalty=${penalty} adjusted=${adjusted} for studentId=${studentId}`,
            );
        }
        return adjusted;
    }

    getCluster(score: number): CapabilityCluster {
        if (score <= 30) return CapabilityCluster.LOW;
        if (score <= 50) return CapabilityCluster.MEDIUM;
        return CapabilityCluster.HIGH;
    }

    getClusterFromMessages(messages: Message[]): CapabilityCluster {
        const score = this.computeScore(messages);
        return this.getCluster(score);
    }

    /**
     * Returns the capability cluster for a student, factoring in both
     * message-based score AND accumulated simplify button penalties.
     */
    getClusterForStudent(studentId: string, baseScore: number): CapabilityCluster {
        const penalty = this.getSimplifyPenalty(studentId);
        const adjusted = Math.max(0, baseScore - penalty);
        return this.getCluster(adjusted);
    }
}
