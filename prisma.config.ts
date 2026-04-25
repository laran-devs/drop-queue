import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Используем переменную напрямую, чтобы не падать при билде
    url: process.env.DATABASE_URL || 'postgresql://root:password@db:5432/dropqueue?schema=public',
  },
})
