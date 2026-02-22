import {
    Injectable,
    Logger,
    InternalServerErrorException,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';

interface SpeechJob {
    resolve: (transcription: string) => void;
    reject: (error: Error) => void;
}

interface ActiveWorker {
    worker: Worker;
    busy: boolean;
}

interface WorkerResult {
    transcription: string;
    error?: string;
}

const WORKER_POOL_SIZE = 3;

@Injectable()
export class SpeechService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SpeechService.name);
    private workerPool: ActiveWorker[] = [];
    private jobQueue: Array<{ audioBuffer: Buffer; job: SpeechJob }> = [];

    private get whisperBinaryPath(): string {
        return process.env.WHISPER_BINARY_PATH ?? 'whisper-cli';
    }

    private get whisperModelPath(): string {
        return process.env.WHISPER_MODEL_PATH ?? 'models/ggml-base.bin';
    }

    onModuleInit(): void {
        this.logger.log(`Initializing speech worker pool with ${WORKER_POOL_SIZE} workers`);
        for (let i = 0; i < WORKER_POOL_SIZE; i++) {
            this.spawnWorkerSlot();
        }
    }

    onModuleDestroy(): void {
        this.logger.log('Terminating speech worker pool');
        for (const slot of this.workerPool) {
            void slot.worker.terminate();
        }
    }

    private spawnWorkerSlot(): void {
        const slot: ActiveWorker = {
            worker: null as unknown as Worker,
            busy: false,
        };
        this.workerPool.push(slot);
        // Slot is created lazily when a job arrives
    }

    private getFreeSlotIndex(): number {
        return this.workerPool.findIndex((slot) => !slot.busy);
    }

    private processQueue(): void {
        if (this.jobQueue.length === 0) return;
        const freeIdx = this.getFreeSlotIndex();
        if (freeIdx === -1) return;

        const { audioBuffer, job } = this.jobQueue.shift()!;
        this.workerPool[freeIdx].busy = true;

        // __dirname at runtime = dist/modules/speech/
        // speech.worker.js compiles to  dist/workers/speech.worker.js
        // so we need two levels up: dist/modules/speech → dist/modules → dist
        const workerPath = join(__dirname, '..', '..', 'workers', 'speech.worker.js');

        const worker = new Worker(workerPath, {
            workerData: {
                audioBuffer: Array.from(audioBuffer),
                whisperBinaryPath: this.whisperBinaryPath,
                whisperModelPath: this.whisperModelPath,
            },
        });

        this.workerPool[freeIdx].worker = worker;

        worker.once('message', (result: WorkerResult) => {
            this.workerPool[freeIdx].busy = false;
            if (result.error) {
                this.logger.error(`Speech worker error: ${result.error}`);
                job.reject(new InternalServerErrorException(result.error));
            } else {
                this.logger.log(`Transcription complete: "${result.transcription.substring(0, 50)}..."`);
                job.resolve(result.transcription);
            }
            // Process next item in the queue
            this.processQueue();
        });

        worker.once('error', (err) => {
            this.workerPool[freeIdx].busy = false;
            this.logger.error(`Worker thread error: ${err.message}`);
            job.reject(err);
            this.processQueue();
        });
    }

    async transcribe(audioBuffer: Buffer): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.jobQueue.push({
                audioBuffer,
                job: { resolve, reject },
            });
            this.processQueue();
        });
    }
}
