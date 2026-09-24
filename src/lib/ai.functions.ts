// ============================================================
// AI Functions - Server-side AI Operations
// v2.0: Agentic, Autonomous, DA/BI Enhanced
// ============================================================

import { createServerFn } from '@tanstack/react-start'
import { streamText, Output } from 'ai'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { PLATFORMS, type PlatformId } from '@/lib/platforms'

const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]]

// ============================================================
// AGENTIC REPURPOSE FUNCTION
// ============================================================

const RepurposeInput = z.object({
  idea: z.string().min(3).max(6000),
  tone: z.string().max(80).nullable(),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1),
  mediaName: z.string().max(200).nullable(),
  mediaKind: z.enum(['video', 'image', 'audio']).nullable(),
  autonomyLevel: z.enum(['assisted', 'semi_autonomous', 'autonomous']).default('autonomous'),
})

const OutputSchema = z.object({
  outputs: z.array(
    z.object({
      platform: z.enum(PLATFORM_IDS),
      title: z.string(),
      body: z.string(),
      hashtags: z.array(z.string()),
      formatNotes: z.string(),
      bestTime: z.string(),
      hook: z.string(),
      cta: z.string(),
      onScreenText: z.string(),
      thumbnailConcept: z.string(),
      confidence: z.number().optional(),
    }),
  ),
  agentMetadata: z.object({
    processingTime: z.number(),
    clipsIdentified: z.number(),
    confidenceScore: z.number(),
  }).optional(),
})

export type RepurposeOutput = z.infer<typeof OutputSchema>['outputs'][number]

export const repurposeContent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RepurposeInput.parse(input))
  .handler(async ({ data }) => {
    const key = import.meta.env.VITE_LOVABLE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
    if (!key) throw new Error('AI is not configured.')

    const { openai } = await import('@ai-sdk/openai')
    const model = openai('gpt-4o')

    const targets = PLATFORMS.filter((p) => data.platforms.includes(p.id))
    const platformGuide = targets
      .map((p) => `- ${p.id} (${p.name}): ${p.charLimit} chars. ${p.format}`)
      .join('\n')

    const system = `You are the Content Repurpose Agent for End Time Soldiers (ETS), a Christian ministry. Voice: bold, faith-filled, urgent yet hopeful. Keep scripture accurate. Never exceed platform limits. NEVER fabricate content.`

    const prompt = `Core idea: """\n${data.idea}\n"""\n${data.tone ? `Tone: ${data.tone}.\n` : ''}${data.mediaName ? `Media: ${data.mediaName} (${data.mediaKind}).\n` : ''}Platforms:\n${platformGuide}\n\nFor each platform, return exactly one output: {title, hook, body, hashtags, formatNotes, bestTime, cta, onScreenText, thumbnailConcept, confidence}`

    try {
      const result = await streamText({
        model,
        system,
        prompt,
        output: Output.object({ schema: OutputSchema }),
        maxSteps: data.autonomyLevel === 'autonomous' ? 10 : 3,
        temperature: 0.7,
      })

      const output = await result.output
      return { outputs: output.outputs }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('402')) throw new Error('AI credits exhausted.')
      if (message.includes('429')) throw new Error('AI rate limited. Please wait a moment.')
      throw new Error(`AI generation failed: ${message}`)
    }
  })

// ============================================================
// AUTONOMOUS SCHEDULE OPTIMIZATION
// ============================================================

const ScheduleInput = z.object({
  dateRange: z.object({ start: z.string(), end: z.string() }),
  pillars: z.array(z.string()).optional(),
  optimizationMode: z.enum(['standard', 'ai_optimized', 'autonomous']).default('ai_optimized'),
})

export const optimizeSchedule = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScheduleInput.parse(input))
  .handler(async ({ data }) => {
    const key = import.meta.env.VITE_LOVABLE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
    if (!key) throw new Error('AI is not configured.')

    const { openai } = await import('@ai-sdk/openai')
    const model = openai('gpt-4o')

    const system = `You are the Schedule Optimizer Agent. Optimize content posting across all platforms for maximum engagement. Consider time zones, platform best times, content pillars, and variety.`

    const prompt = `Optimize content scheduling from ${data.dateRange.start} to ${data.dateRange.end}. Pillars: ${data.pillars?.join(', ') || 'all'}. Mode: ${data.optimizationMode}. Return JSON: { schedule: [{date, time, platform, content_id, pillar}], insights: [...] }`

    const result = await streamText({
      model,
      system,
      prompt,
      output: Output.object({
        schema: z.object({
          schedule: z.array(z.object({ date: z.string(), time: z.string(), platform: z.string(), content_id: z.string(), pillar: z.string() })),
          insights: z.array(z.string()),
        }),
      }),
    })

    const output = await result.output
    return output
  })

// ============================================================
// DA/BI REPORT GENERATION
// ============================================================

const ReportInput = z.object({
  reportType: z.enum(['engagement', 'performance', 'trends', 'insights', 'comprehensive']),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  platforms: z.array(z.string()).optional(),
})

export const generateReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    const key = import.meta.env.VITE_LOVABLE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
    if (!key) throw new Error('AI is not configured.')

    const { openai } = await import('@ai-sdk/openai')
    const model = openai('gpt-4o')

    const system = `You are a DA/BI Analyst for End Time Soldiers. Generate comprehensive analytics reports with actionable insights.`

    const prompt = `Generate a ${data.reportType} report for ${data.dateRange.start} to ${data.dateRange.end}. Platforms: ${data.platforms?.join(', ') || 'all'}. Focus on trends, patterns, opportunities, and recommendations.`

    const result = await streamText({
      model,
      system,
      prompt,
      maxTokens: 2000,
    })

    const text = await result.text
    return { report: text }
  })

// ============================================================
// AUTONOMOUS AI CONTENT GENERATION
// ============================================================

const AutonomousGenerateInput = z.object({
  task: z.enum(['repurpose', 'schedule', 'publish', 'analyze', 'scout']),
  input: z.record(z.any()),
  autonomyLevel: z.enum(['assisted', 'semi_autonomous', 'autonomous']).default('autonomous'),
})

export const autonomousGenerate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AutonomousGenerateInput.parse(input))
  .handler(async ({ data }) => {
    const key = import.meta.env.VITE_LOVABLE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
    if (!key) throw new Error('AI is not configured.')

    const { openai } = await import('@ai-sdk/openai')
    const model = openai('gpt-4o')

    const taskPrompts: Record<string, string> = {
      repurpose: `Analyze content and generate platform-specific versions.`,
      schedule: `Optimize content scheduling for maximum engagement.`,
      publish: `Prepare and dispatch content for publishing.`,
      analyze: `Analyze performance data and generate insights.`,
      scout: `Scan media library for new content opportunities.`,
    }

    const result = await streamText({
      model,
      system: `You are an autonomous AI agent for End Time Soldiers. Complete the task: ${taskPrompts[data.task] || 'General task'} Autonomy: ${data.autonomyLevel}`,
      prompt: JSON.stringify(data.input),
      output: Output.object({ schema: z.object({ result: z.any(), confidence: z.number(), steps: z.array(z.string()) }) }),
      maxSteps: data.autonomyLevel === 'autonomous' ? 10 : 3,
    })

    const output = await result.output
    return output
  })
