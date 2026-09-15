import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined' || !POSTHOG_KEY || isInitialized) {
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      loaded: () => {
        isInitialized = true;
      },
    });
  } catch (err) {
    console.warn('[PostHog] Init skipped or failed:', err);
  }
}

/**
 * Track a custom event safely
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    // Graceful no-op
  }
}

/**
 * Track terminal command execution
 */
export function trackCommand(command: string, source: 'cli' | 'slash_palette' | 'shortcut') {
  trackEvent('terminal_command_executed', {
    command,
    source,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track Easter egg triggers
 */
export function trackEasterEgg(
  name: 'matrix_digital_rain' | 'snake_game' | 'konami_code' | 'logo_clicks',
  details?: Record<string, unknown>
) {
  trackEvent('easter_egg_triggered', {
    egg_name: name,
    ...details,
  });
}

/**
 * Track resume downloads
 */
export function trackResumeDownload() {
  trackEvent('resume_download_clicked', {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track project link visits
 */
export function trackProjectClick(projectName: string, linkType: 'github' | 'live' | 'demo') {
  trackEvent('project_link_clicked', {
    project: projectName,
    link_type: linkType,
  });
}

export { posthog };
