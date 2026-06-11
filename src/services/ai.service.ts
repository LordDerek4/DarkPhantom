import Anthropic from '@anthropic-ai/sdk'
import {
  collection, addDoc, query, where, orderBy, limit, getDocs,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { AICommandType, AIInteraction } from '@/types/extended'

const AI_INTERACTIONS = 'aiInteractions'
const MAX_CONTEXT_MESSAGES = 20

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!key) throw new Error('VITE_ANTHROPIC_API_KEY not set in .env')
    client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  }
  return client
}

async function fetchChannelContext(channelId: string, count = MAX_CONTEXT_MESSAGES): Promise<string[]> {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => {
      const data = d.data()
      return `[${data.authorId}]: ${data.content}`
    })
    .reverse()
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<{ text: string; tokens: number }> {
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

export async function runAICommand(
  command: AICommandType,
  input: string,
  channelId: string,
  serverId: string,
  userId: string
): Promise<string> {
  const context = await fetchChannelContext(channelId)

  let systemPrompt = ''
  let userMessage = ''

  switch (command) {
    case 'ask':
      systemPrompt = `You are a helpful AI assistant for a chat community. You have access to recent conversation context. Answer questions accurately and concisely based on the conversation or your general knowledge. Format responses in markdown when helpful.`
      userMessage = `Recent conversation:\n${context.join('\n')}\n\nQuestion: ${input}`
      break

    case 'summarize':
      systemPrompt = `You are a community assistant. Summarize the recent conversation into key points. Be concise, use bullet points, and highlight important decisions or announcements.`
      userMessage = `Summarize this conversation:\n${context.join('\n')}\n\nAdditional focus: ${input || 'general summary'}`
      break

    case 'explain':
      systemPrompt = `You are a community assistant. Explain the given topic based on the context of the conversation and your general knowledge. Be clear and helpful.`
      userMessage = `Context:\n${context.join('\n')}\n\nExplain: ${input}`
      break

    case 'faq':
      systemPrompt = `You are a community assistant. Based on the conversation, generate a helpful FAQ section with common questions and clear answers. Format as Q: ... A: ... pairs.`
      userMessage = `Generate an FAQ from this conversation:\n${context.join('\n')}`
      break

    case 'announce':
      systemPrompt = `You are a professional community manager. Create a clear, engaging announcement message based on the provided information. Use a professional but friendly tone. Include relevant emojis sparingly.`
      userMessage = `Create an announcement about: ${input}\n\nContext: ${context.slice(-5).join('\n')}`
      break

    case 'onboard':
      systemPrompt = `You are a welcoming community guide. Create a friendly, personalized onboarding message for a new member. Be warm, helpful, and highlight what makes this community great. Keep it under 200 words.`
      userMessage = `Create an onboarding welcome for a new member. Context about the server:\n${context.slice(-10).join('\n')}`
      break

    default:
      systemPrompt = `You are a helpful community assistant.`
      userMessage = input
  }

  const { text, tokens } = await callClaude(systemPrompt, userMessage)

  await addDoc(collection(db, AI_INTERACTIONS), {
    serverId,
    channelId,
    userId,
    command,
    input,
    output: text,
    context,
    createdAt: serverTimestamp(),
    helpful: null,
    tokens,
  })

  return text
}

export async function generateChannelSummary(
  channelId: string,
  serverId: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<{
  summary: string
  keyTopics: string[]
  importantDecisions: string[]
  trendingDiscussions: string[]
}> {
  const msgCount = period === 'daily' ? 100 : period === 'weekly' ? 500 : 1000
  const context = await fetchChannelContext(channelId, msgCount)

  if (context.length === 0) {
    return {
      summary: 'No messages in this period.',
      keyTopics: [],
      importantDecisions: [],
      trendingDiscussions: [],
    }
  }

  const { text } = await callClaude(
    `You are a community analytics AI. Analyze conversations and return a JSON object with these fields:
    - summary: string (2-3 sentence overview)
    - keyTopics: string[] (up to 5 main topics discussed)
    - importantDecisions: string[] (up to 5 decisions made)
    - trendingDiscussions: string[] (up to 5 popular threads)

    Return ONLY valid JSON, no markdown.`,
    `Analyze this ${period} conversation:\n${context.join('\n')}`
  )

  try {
    return JSON.parse(text)
  } catch {
    return {
      summary: text.slice(0, 300),
      keyTopics: [],
      importantDecisions: [],
      trendingDiscussions: [],
    }
  }
}

export async function moderateMessage(content: string): Promise<{
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  categories: string[]
  confidence: number
  autoAction: 'none' | 'warn' | 'delete' | 'timeout' | 'flag'
}> {
  const { text } = await callClaude(
    `You are a content moderation AI. Analyze messages for: spam, harassment, toxicity, hate speech, scams, NSFW content.
    Return ONLY valid JSON: { riskLevel: "safe"|"low"|"medium"|"high"|"critical", categories: string[], confidence: 0-1, autoAction: "none"|"warn"|"delete"|"timeout"|"flag" }`,
    `Moderate this message: "${content}"`
  )

  try {
    return JSON.parse(text)
  } catch {
    return { riskLevel: 'safe', categories: [], confidence: 0, autoAction: 'none' }
  }
}

export async function generateKnowledgeBaseItem(
  messages: string[],
  type: 'guide' | 'faq' | 'documentation' | 'tutorial'
): Promise<{ title: string; content: string; tags: string[] }> {
  const { text } = await callClaude(
    `You are a technical writer. Convert conversation excerpts into a well-structured knowledge base article.
    Return ONLY valid JSON: { title: string, content: string (markdown), tags: string[] }`,
    `Create a ${type} from these messages:\n${messages.join('\n')}`
  )

  try {
    return JSON.parse(text)
  } catch {
    return { title: 'Community Guide', content: text, tags: [] }
  }
}

export async function generateOnboarding(
  serverName: string,
  serverDescription: string,
  channelNames: string[],
  topContributors: string[]
): Promise<{ greeting: string; suggestedChannels: string[]; tips: string[] }> {
  const { text } = await callClaude(
    `You are a friendly community guide. Create a personalized onboarding experience.
    Return ONLY valid JSON: { greeting: string, suggestedChannels: string[], tips: string[] }`,
    `Server: ${serverName}
Description: ${serverDescription}
Channels: ${channelNames.join(', ')}
Active members: ${topContributors.join(', ')}`
  )

  try {
    return JSON.parse(text)
  } catch {
    return {
      greeting: `Welcome to ${serverName}! We're glad you're here.`,
      suggestedChannels: channelNames.slice(0, 3),
      tips: ['Say hello in general!', 'Check out the rules channel', 'Explore the channels list'],
    }
  }
}

export async function getAIAnswer(question: string, context: string): Promise<string> {
  const { text } = await callClaude(
    'You are a helpful community AI assistant. Answer questions concisely.',
    `Context: ${context}\n\nQuestion: ${question}`
  )
  return text
}

export async function generateMeetingNotes(transcript: string): Promise<{
  summary: string
  actionItems: string[]
  decisions: string[]
  followUps: string[]
}> {
  const { text } = await callClaude(
    `You are a meeting notes AI. Extract structured information from transcripts.
    Return ONLY valid JSON: { summary: string, actionItems: string[], decisions: string[], followUps: string[] }`,
    `Meeting transcript:\n${transcript}`
  )

  try {
    return JSON.parse(text)
  } catch {
    return { summary: text, actionItems: [], decisions: [], followUps: [] }
  }
}
