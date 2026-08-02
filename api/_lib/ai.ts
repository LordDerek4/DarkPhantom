import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    client = new Anthropic({ apiKey: key })
  }
  return client
}

export async function callClaude(systemPrompt: string, userMessage: string): Promise<{ text: string; tokens: number }> {
  const ai = getClient()
  const response = await ai.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const tokens = response.usage.input_tokens + response.usage.output_tokens
  return { text, tokens }
}

export function buildCommandPrompt(command: string, input: string, context: string[]): { systemPrompt: string; userMessage: string } {
  switch (command) {
    case 'ask':
      return {
        systemPrompt: `You are a helpful AI assistant for a chat community. You have access to recent conversation context. Answer questions accurately and concisely based on the conversation or your general knowledge. Format responses in markdown when helpful.`,
        userMessage: `Recent conversation:\n${context.join('\n')}\n\nQuestion: ${input}`,
      }
    case 'summarize':
      return {
        systemPrompt: `You are a community assistant. Summarize the recent conversation into key points. Be concise, use bullet points, and highlight important decisions or announcements.`,
        userMessage: `Summarize this conversation:\n${context.join('\n')}\n\nAdditional focus: ${input || 'general summary'}`,
      }
    case 'explain':
      return {
        systemPrompt: `You are a community assistant. Explain the given topic based on the context of the conversation and your general knowledge. Be clear and helpful.`,
        userMessage: `Context:\n${context.join('\n')}\n\nExplain: ${input}`,
      }
    case 'faq':
      return {
        systemPrompt: `You are a community assistant. Based on the conversation, generate a helpful FAQ section with common questions and clear answers. Format as Q: ... A: ... pairs.`,
        userMessage: `Generate an FAQ from this conversation:\n${context.join('\n')}`,
      }
    case 'announce':
      return {
        systemPrompt: `You are a professional community manager. Create a clear, engaging announcement message based on the provided information. Use a professional but friendly tone. Include relevant emojis sparingly.`,
        userMessage: `Create an announcement about: ${input}\n\nContext: ${context.slice(-5).join('\n')}`,
      }
    case 'notes':
      return {
        systemPrompt: `You are a professional meeting notes taker. Extract and structure meeting notes from this conversation. Use clear headings: ## Attendees, ## Key Discussion Points, ## Decisions Made, ## Action Items, ## Next Steps. Be concise and factual.`,
        userMessage: `Create structured meeting notes from this conversation:\n${context.join('\n')}\n\nAdditional context: ${input || 'none'}`,
      }
    default:
      return {
        systemPrompt: `You are a helpful community assistant.`,
        userMessage: input,
      }
  }
}

export const SMART_REPLY_SYSTEM_PROMPT = `You are a smart reply assistant. Given the recent chat messages, suggest exactly 3 short, natural reply options. Each reply should be 2-12 words, conversational, and appropriate. Return ONLY a JSON array of 3 strings, e.g. ["Sure, sounds good!", "Let me check on that", "I agree completely"]. No other text.`
