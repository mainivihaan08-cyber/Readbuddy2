/**
 * ReadBuddy Permission Manager Utility
 * Fulfills Android & PWA microphone and notification runtime permission guidelines.
 * Checks, requests, explains, and handles permanently denied cases without blocking alerts.
 */

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (err) {
    console.warn('[PermissionManager] Permissions API query failed:', err);
  }

  // Fallback to mediaDevices check if permissions query is unsupported
  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = devices.some(d => d.kind === 'audioinput');
      if (hasAudio) return 'prompt';
    }
  } catch {}

  return 'prompt';
}

export async function isMicrophoneInputAvailable(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      // If enumerateDevices is not available, assume true if getUserMedia exists
      return !!navigator.mediaDevices?.getUserMedia;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    // Do NOT require deviceId !== '' because in many browsers/sandboxes deviceId is empty until granted
    const available = devices.some(device => device.kind === 'audioinput') || devices.length === 0;
    console.log('[PermissionManager] Microphones enumerated. Available:', available);
    return true;
  } catch (err) {
    console.warn('[PermissionManager] enumerateDevices failed:', err);
    return true; // Gracefully allow getUserMedia to attempt
  }
}

export async function requestMicrophonePermission(
  onShowExplanation?: () => Promise<boolean>
): Promise<{ status: 'granted' | 'denied' | 'permanently_denied'; error?: string }> {
  try {
    if (onShowExplanation) {
      const proceed = await onShowExplanation();
      if (!proceed) return { status: 'denied', error: 'user_dismissed' };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

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

export async function ensureMicrophoneGranted(_language: 'en' | 'hi' = 'en'): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    // Request stream directly without window.alert or window.confirm (avoids iframe blocking)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    if (stream && stream.getAudioTracks().length > 0) {
      // Permission granted, release initial probe tracks
      stream.getTracks().forEach(t => t.stop());
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('[PermissionManager] Microphone check/prompt result:', err);
    // Even if getUserMedia has an error, don't hard block speech recognition if supported
    return false;
  }
}

export async function ensureNotificationsGranted(_language: 'en' | 'hi' = 'en'): Promise<boolean> {
  const current = await checkNotificationPermission();
  if (current === 'granted') {
    return true;
  }
  const result = await requestNotificationPermission();
  return result === 'granted';
}
