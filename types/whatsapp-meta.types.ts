/**
 * Types for the WhatsApp Cloud API (Meta Graph API).
 * Only the shapes this app actually consumes are modeled.
 */

export interface MetaMessageResponse {
    messaging_product: string;
    contacts?: Array<{ profile: { name?: string }; wa_id: string }>;
    messages: Array<{ id: string; message_status?: string }>;
}

export interface MetaTemplateComponent {
    type: string;
    parameters?: Array<Record<string, unknown>>;
    sub_type?: string;
    index?: string;
    // Meta payloads are open-ended; keeps the type assignable to
    // Record<string, unknown> used by the message entity.
    [key: string]: unknown;
}

export interface MetaErrorBody {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_data?: { details?: string };
    };
}

/** Webhook payload pushed by Meta (messages events) */
export interface MetaWebhookPayload {
    object?: string;
    entry?: Array<{
        id?: string;
        changes?: Array<{
            field?: string;
            value?: {
                messaging_product?: string;
                metadata?: {
                    display_phone_number?: string;
                    phone_number_id?: string;
                };
                contacts?: Array<{
                    profile?: { name?: string };
                    wa_id?: string;
                }>;
                messages?: Array<{
                    from?: string;
                    id?: string;
                    timestamp?: string;
                    text?: { body?: string };
                    type?: string;
                    button?: { text?: string; payload?: string };
                    interactive?: {
                        button_reply?: { id?: string; title?: string };
                        list_reply?: { id?: string; title?: string };
                    };
                }>;
                statuses?: Array<{
                    id?: string;
                    status?: string;
                    recipient_id?: string;
                }>;
            };
        }>;
    }>;
}

/** Narrow an unknown value into a webhook payload (replaces `as any`) */
export function isMetaWebhookPayload(value: unknown): value is MetaWebhookPayload {
    return (
        typeof value === "object" &&
        value !== null &&
        "object" in value &&
        "entry" in value
    );
}
