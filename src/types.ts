/**
 * Type definitions for the LLM chat application.
 */


/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}
