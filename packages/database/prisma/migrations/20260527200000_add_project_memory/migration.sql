-- CreateEnum
CREATE TYPE "MemorySource" AS ENUM ('TASK', 'DOCUMENT', 'INSIGHT', 'CONVERSATION', 'PLAN', 'PROJECT');

-- CreateTable
CREATE TABLE "project_memories" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "tasksJson" JSONB NOT NULL,
    "documentsJson" JSONB NOT NULL,
    "insightsJson" JSONB NOT NULL,
    "conversationsJson" JSONB NOT NULL,
    "planJson" JSONB,
    "teamJson" JSONB NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_chunks" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "sourceType" "MemorySource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "metadata" JSONB,
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "project_memories_projectId_key" ON "project_memories"("projectId");

-- CreateIndex
CREATE INDEX "project_memories_projectId_idx" ON "project_memories"("projectId");

-- CreateIndex
CREATE INDEX "memory_chunks_memoryId_sourceType_idx" ON "memory_chunks"("memoryId", "sourceType");

-- CreateIndex
CREATE INDEX "memory_chunks_sourceId_idx" ON "memory_chunks"("sourceId");

-- AddForeignKey
ALTER TABLE "project_memories" ADD CONSTRAINT "project_memories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "project_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
