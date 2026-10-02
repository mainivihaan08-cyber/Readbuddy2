/**
 * Audio Transcription & Speech Coach Report API client
 */

export interface TranscribeResponse {
  transcript: string;
  error?: string;
}

export interface SpeechCoachReportResponse {
  report: string;
  error?: string;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe recorded audio using model gemini-3.5-transcribe via server endpoint
 */
export async function transcribeAudioWithGemini(audioBlob: Blob): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);
  const mimeType = audioBlob.type || 'audio/webm';

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioData: base64Audio,
      mimeType,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Transcription request failed with status ${res.status}`);
  }

  const data: TranscribeResponse = await res.json();
  return data.transcript;
}

/**
 * Generate 31-step AI Speech & Voice Coach report
 */
export async function generateSpeechCoachReport(params: {
  audioBlob?: Blob | null;
  transcript?: string;
  targetText?: string;
  childName?: string;
  grade?: string;
}): Promise<string> {
  let base64Audio: string | undefined = undefined;
  let mimeType: string | undefined = undefined;

  if (params.audioBlob && params.audioBlob.size > 0) {
    base64Audio = await blobToBase64(params.audioBlob);
    mimeType = params.audioBlob.type || 'audio/webm';
  }

  const res = await fetch('/api/speech-coach-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioData: base64Audio,
      mimeType,
      transcript: params.transcript,
      targetText: params.targetText,
      childName: params.childName,
      grade: params.grade,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Speech coach analysis failed with status ${res.status}`);
  }

  const data: SpeechCoachReportResponse = await res.json();
  return data.report;
}
