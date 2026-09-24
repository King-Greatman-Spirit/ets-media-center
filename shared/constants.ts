export const CATEGORIES = [
  'Scripture',
  'Prayer',
  'Worship',
  'Teaching',
  'Gospel',
  'Evangelism',
  'Discipleship',
  'Encouragement',
  'Testimony',
  'Bible Study',
  'End-Time Readiness',
  'Leadership',
] as const

export const PLATFORM_NAMES = [
  'youtube',
  'youtube_shorts',
  'tiktok',
  'instagram',
  'facebook',
  'x_twitter',
  'threads',
  'linkedin',
  'telegram',
  'whatsapp',
] as const

export const POST_TIMES = ['06:00', '12:00', '18:00'] as const

export const TIME_SLOT_LABELS = {
  '06:00': '6:00 AM',
  '12:00': '12:00 PM',
  '18:00': '6:00 PM',
} as const

export const PILLARS = {
  'Scripture & Prayer': ['6:00 AM', '6:00 PM'],
  'Teaching & Sermon': ['12:00 PM'],
  'Gospel & Worship': ['6:00 PM'],
  'Encouragement': ['6:00 AM', '12:00 PM'],
  'Evangelism': ['6:00 PM'],
  'Discipleship': ['12:00 PM'],
  'Community': ['6:00 PM'],
} as const

export const CONTENT_FORMATS = {
  youtube: 'landscape',
  youtube_shorts: 'portrait',
  tiktok: 'portrait',
  instagram: 'portrait',
  facebook: 'portrait',
  x_twitter: 'landscape',
  threads: 'landscape',
  linkedin: 'landscape',
  telegram: 'portrait',
  whatsapp: 'portrait',
} as const

export const MAX_CAPTIONS: Record<string, number> = {
  youtube: 5000,
  youtube_shorts: 150,
  tiktok: 2200,
  instagram: 2200,
  facebook: 63200,
  x_twitter: 280,
  threads: 500,
  linkedin: 3000,
  telegram: 4096,
  whatsapp: 16384,
} as const

export const HASHTAG_COUNTS: Record<string, number> = {
  youtube: 15,
  youtube_shorts: 8,
  tiktok: 8,
  instagram: 15,
  facebook: 5,
  x_twitter: 3,
  threads: 3,
  linkedin: 7,
  telegram: 10,
  whatsapp: 5,
} as const
