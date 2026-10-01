/**
 * Audio Recorder using MediaRecorder API to save sessions locally
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime = 0;
  private stream: MediaStream | null = null;

  public async start(): Promise<boolean> {
    try {
      this.audioChunks = [];

      // Request microphone permission only once; reuse active stream
      if (
        !this.stream ||
        !this.stream.active ||
        !this.stream.getAudioTracks().some((t) => t.readyState === 'live')
      ) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Determine supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(250); // collect slice every 250ms
      return true;
    } catch (err) {
      console.warn('Audio recording not permitted or unavailable:', err);
      return false;
    }
  }

  public async stop(): Promise<{ blob: Blob; durationSeconds: number } | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        // Keep the stream alive so user isn't prompted for permission again
        resolve({ blob, durationSeconds });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('Error stopping media recorder', e);
        resolve(null);
      }
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  public cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
