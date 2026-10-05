/**
 * ReadBuddy Permission Manager Utility
 * Fulfills Android & PWA microphone and notification runtime permission guidelines.
 * Checks, requests, explains, and handles permanently denied cases.
 */

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      // In some environments, Permissions API returns 'prompt', 'granted', or 'denied'
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (err) {
    console.warn('[PermissionManager] Permissions API query failed:', err);
  }

  // Fallback to mediaDevices check if permissions query is unsupported
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudio = devices.some(d => d.kind === 'audioinput');
    if (!hasAudio) return 'denied';
  } catch {}

  return 'prompt';
}

export async function isMicrophoneInputAvailable(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const available = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
    console.log('[PermissionManager] Microphones enumerated. Available:', available, devices);
    return available;
  } catch (err) {
    console.warn('[PermissionManager] enumerateDevices failed:', err);
    return false;
  }
}

export async function requestMicrophonePermission(
  onShowExplanation: () => Promise<boolean>
): Promise<{ status: 'granted' | 'denied' | 'permanently_denied'; error?: string }> {
  const current = await checkMicrophonePermission();
  if (current === 'granted') {
    const available = await isMicrophoneInputAvailable();
    if (!available) {
      return { status: 'denied', error: 'no_device_available' };
    }
    return { status: 'granted' };
  }

  // Prompt or explain to user
  const userProceed = await onShowExplanation();
  if (!userProceed) {
    return { status: 'denied', error: 'user_dismissed' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Make sure we have a valid audio track
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) {
      stream.getTracks().forEach(t => t.stop());
      return { status: 'denied', error: 'no_audio_tracks_received' };
    }

    // Stop tracks immediately after securing permission to release the device
    stream.getTracks().forEach(track => track.stop());

    return { status: 'granted' };
  } catch (err: any) {
    console.warn('[PermissionManager] getUserMedia permission request failed:', err);
    const errName = err?.name || err?.message || '';
    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errName.includes('denied') ||
      errName.includes('Allowed')
    ) {
      return { status: 'permanently_denied', error: err?.message || 'permission_blocked' };
    }
    return { status: 'denied', error: err?.message || 'unknown_error' };
  }
}

export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  const state = Notification.permission;
  if (state === 'default') return 'prompt';
  return state as 'granted' | 'denied' | 'prompt';
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch (err) {
    console.warn('[PermissionManager] requestPermission for notifications failed:', err);
    return 'denied';
  }
}

export async function ensureMicrophoneGranted(language: 'en' | 'hi'): Promise<boolean> {
  const current = await checkMicrophonePermission();
  if (current === 'granted') {
    const available = await isMicrophoneInputAvailable();
    if (!available) {
      const msg = language === 'en'
        ? "No microphone/audio input device was found. Please connect or check your microphone."
        : "कोई माइक्रोफ़ोन उपलब्ध नहीं मिला। कृपया अपना माइक कनेक्ट करें या जाँचें।";
      alert(msg);
      return false;
    }
    return true;
  }

  const result = await requestMicrophonePermission(async () => {
    return new Promise<boolean>((resolve) => {
      const msg = language === 'en'
        ? "ReadBuddy needs access to your Microphone to hear the child's speech, analyze pronunciation, and provide speech-therapy feedback. Would you like to allow microphone access?"
        : "रीडबडी को बच्चे की आवाज़ सुनने, उच्चारण का विश्लेषण करने और प्रतिक्रिया देने के लिए आपके माइक तक पहुंच की आवश्यकता है। क्या आप माइक की अनुमति देना चाहते हैं?";
      resolve(window.confirm(msg));
    });
  });

  if (result.status === 'permanently_denied') {
    const msg = language === 'en'
      ? "Microphone access is permanently denied. Please go to: Android Settings > App permissions > Microphone to allow it."
      : "माइक्रोफ़ोन अनुमति स्थायी रूप से अस्वीकृत है। कृपया इसे सक्षम करने के लिए: Android Settings > App permissions > Microphone पर जाएं।";
    alert(msg);
    return false;
  }

  if (result.status !== 'granted') {
    const msg = language === 'en'
      ? "Microphone permission is required to start speech practice."
      : "भाषण अभ्यास शुरू करने के लिए माइक्रोफ़ोन अनुमति आवश्यक है।";
    alert(msg);
    return false;
  }

  const available = await isMicrophoneInputAvailable();
  if (!available) {
    const msg = language === 'en'
      ? "No microphone/audio input device was found. Please connect or check your microphone."
      : "कोई माइक्रोफ़ोन उपलब्ध नहीं मिला। कृपया अपना माइक कनेक्ट करें या जाँचें।";
    alert(msg);
    return false;
  }

  // Brief warm-up delay to let audio systems initialize
  await new Promise((r) => setTimeout(r, 100));

  return true;
}

export async function ensureNotificationsGranted(language: 'en' | 'hi'): Promise<boolean> {
  const current = await checkNotificationPermission();
  if (current === 'granted') {
    return true;
  }

  const msg = language === 'en'
    ? "ReadBuddy would like to send you notifications for daily reading challenges, reminders, and progress milestones. Would you like to allow notifications?"
    : "रीडबडी आपको दैनिक पठन चुनौतियों, अनुस्मारक और प्रगति के मील के पत्थर के लिए सूचनाएं भेजना चाहता है। क्या आप सूचनाओं की अनुमति देना चाहते हैं?";
  
  if (!window.confirm(msg)) {
    return false;
  }

  const result = await requestNotificationPermission();
  if (result !== 'granted') {
    const blockMsg = language === 'en'
      ? "Notifications are blocked. You can enable them anytime in Android Settings > App permissions > Notifications."
      : "सूचनाएं अवरुद्ध हैं। आप इन्हें किसी भी समय Android Settings > App permissions > Notifications में सक्षम कर सकते हैं।";
    alert(blockMsg);
    return false;
  }

  return true;
}

