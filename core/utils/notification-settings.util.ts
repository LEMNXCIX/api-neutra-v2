/**
 * Notification Settings Helper
 * Utilities for checking tenant notification preferences
 */

export interface NotificationSettings {
    channels?: {
        email?: boolean;
        whatsapp?: boolean;
        push?: boolean;
    };
    events?: {
        appointmentConfirmed?: NotificationChannels;
        appointmentCancelled?: NotificationChannels;
        appointmentPending?: NotificationChannels;
        appointmentReminder?: NotificationChannels;
        orderConfirmed?: NotificationChannels;
        welcome?: NotificationChannels;
        passwordReset?: NotificationChannels;
    };
}

export interface NotificationChannels {
    email?: boolean;
    whatsapp?: boolean;
    push?: boolean;
}

/**
 * Check if a notification channel is enabled for a specific event
 * @param settings Tenant notification settings
 * @param channel Channel to check (email, whatsapp, push)
 * @param eventType Event type (appointmentConfirmed, welcome, etc.)
 * @returns true if channel is enabled, false otherwise
 */
export function isChannelEnabled(
    settings: NotificationSettings | null | undefined,
    channel: 'email' | 'whatsapp' | 'push',
    eventType?: string
): boolean {
    // If no settings, default to enabled
    if (!settings) return true;

    // Check event-specific settings first
    if (eventType && settings.events) {
        const eventSettings = (settings.events as any)[eventType];
        if (eventSettings && eventSettings[channel] !== undefined) {
            return eventSettings[channel];
        }
    }

    // Fall back to global channel settings
    if (settings.channels && settings.channels[channel] !== undefined) {
        return settings.channels[channel];
    }

    // Default to enabled if not configured
    return true;
}

/**
 * Get enabled channels for a specific event
 * @param settings Tenant notification settings
 * @param eventType Event type
 * @returns Array of enabled channel names
 */
export function getEnabledChannels(
    settings: NotificationSettings | null | undefined,
    eventType?: string
): Array<'email' | 'whatsapp' | 'push'> {
    const channels: Array<'email' | 'whatsapp' | 'push'> = [];

    if (isChannelEnabled(settings, 'email', eventType)) {
        channels.push('email');
    }
    if (isChannelEnabled(settings, 'whatsapp', eventType)) {
        channels.push('whatsapp');
    }
    if (isChannelEnabled(settings, 'push', eventType)) {
        channels.push('push');
    }

    return channels;
}
