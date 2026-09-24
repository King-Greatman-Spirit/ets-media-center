import { createFileRoute } from '@tanstack/react-router'
import { Studio } from '@/components/studio/Studio'

export const Route = createFileRoute('/_authenticated/studio')({
  head: () => ({
    meta: [
      { title: 'AI Studio | ETS Command Center' },
      { name: 'description', content: 'AI-powered content repurposing studio.' },
    ],
  }),
  component: Studio,
})
