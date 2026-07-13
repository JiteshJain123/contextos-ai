/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the `activity_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_invites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspace_invites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspace_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspaces` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "activity_events" DROP CONSTRAINT "activity_events_actorId_fkey";

-- DropForeignKey
ALTER TABLE "activity_events" DROP CONSTRAINT "activity_events_projectId_fkey";

-- DropForeignKey
ALTER TABLE "activity_events" DROP CONSTRAINT "activity_events_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "project_invites" DROP CONSTRAINT "project_invites_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "project_invites" DROP CONSTRAINT "project_invites_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_taskId_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_userId_fkey";

-- DropForeignKey
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_taskId_fkey";

-- DropForeignKey
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_ownerId_fkey";

-- DropIndex
DROP INDEX "projects_workspaceId_idx";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "workspaceId";

-- DropTable
DROP TABLE "activity_events";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "project_invites";

-- DropTable
DROP TABLE "project_members";

-- DropTable
DROP TABLE "task_assignments";

-- DropTable
DROP TABLE "task_comments";

-- DropTable
DROP TABLE "workspace_invites";

-- DropTable
DROP TABLE "workspace_members";

-- DropTable
DROP TABLE "workspaces";

-- DropEnum
DROP TYPE "ActivityEventType";

-- DropEnum
DROP TYPE "ProjectRole";

-- DropEnum
DROP TYPE "WorkspaceRole";
