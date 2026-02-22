/**
 * speech.worker.ts
 * Runs inside a worker_threads Worker.
 * Receives an audio buffer, writes it to a temp file,
 * runs whisper.cpp via child_process.spawn, and returns the transcription.
 */
import { workerData, parentPort } from 'worker_threads';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface WorkerInput {
    audioBuffer: number[];
    whisperBinaryPath: string;
    whisperModelPath: string;
}

interface WorkerResult {
    transcription: string;
    error?: string;
}

async function transcribe(input: WorkerInput): Promise<WorkerResult> {
    const { audioBuffer, whisperBinaryPath, whisperModelPath } = input;
    const tempFilePath = join(tmpdir(), `vidyabot_audio_${randomUUID()}.wav`);

    try {
        // Write the audio buffer to a temp WAV file
        const buffer = Buffer.from(audioBuffer);
        await writeFile(tempFilePath, buffer);

        return await new Promise<WorkerResult>((resolve) => {
            let stdout = '';
            let stderr = '';

            const whisperProcess = spawn(whisperBinaryPath, [
                '--model', whisperModelPath,
                '--language', 'ml',
                '--output-txt',
                '--no-timestamps',
                tempFilePath,
            ]);

            whisperProcess.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            whisperProcess.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            whisperProcess.on('close', (code) => {
                if (code !== 0) {
                    resolve({
                        transcription: '',
                        error: `Whisper exited with code ${code}: ${stderr}`,
                    });
                } else {
                    const transcription = stdout
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0 && !line.startsWith('['))
                        .join(' ')
                        .trim();
                    resolve({ transcription });
                }
            });

            whisperProcess.on('error', (err) => {
                resolve({
                    transcription: '',
                    error: `Failed to spawn whisper process: ${err.message}`,
                });
            });
        });
    } finally {
        // Always clean up temp file
        await unlink(tempFilePath).catch(() => {
            // Ignore cleanup errors
        });
    }
}

// Start transcription with data passed from parent
const input = workerData as WorkerInput;
transcribe(input)
    .then((result) => {
        parentPort?.postMessage(result);
    })
    .catch((err: Error) => {
        parentPort?.postMessage({
            transcription: '',
            error: err.message,
        } as WorkerResult);
    });
