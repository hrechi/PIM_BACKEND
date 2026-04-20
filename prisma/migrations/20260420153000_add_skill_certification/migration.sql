-- CreateTable
CREATE TABLE "skill_paths" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "gradient_start" TEXT,
    "gradient_end" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "estimated_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_lessons" (
    "id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "micro_content" TEXT NOT NULL,
    "skill_tag" TEXT NOT NULL,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 10,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completion_percent" INTEGER NOT NULL DEFAULT 0,
    "last_score" INTEGER,
    "best_score" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "language_code" TEXT NOT NULL DEFAULT 'en-US',
    "last_quiz" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_path_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "completion_percent" INTEGER NOT NULL DEFAULT 0,
    "completed_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "certificate_issued" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_path_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_paths_code_key" ON "skill_paths"("code");

-- CreateIndex
CREATE INDEX "skill_paths_is_active_sort_order_idx" ON "skill_paths"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "skill_lessons_code_key" ON "skill_lessons"("code");

-- CreateIndex
CREATE INDEX "skill_lessons_path_id_sort_order_idx" ON "skill_lessons"("path_id", "sort_order");

-- CreateIndex
CREATE INDEX "skill_lessons_is_active_idx" ON "skill_lessons"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "skill_lesson_progress_user_id_lesson_id_key" ON "skill_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "skill_lesson_progress_user_id_status_idx" ON "skill_lesson_progress"("user_id", "status");

-- CreateIndex
CREATE INDEX "skill_lesson_progress_lesson_id_idx" ON "skill_lesson_progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_path_completions_user_id_path_id_key" ON "skill_path_completions"("user_id", "path_id");

-- CreateIndex
CREATE INDEX "skill_path_completions_user_id_status_idx" ON "skill_path_completions"("user_id", "status");

-- CreateIndex
CREATE INDEX "skill_path_completions_path_id_idx" ON "skill_path_completions"("path_id");

-- AddForeignKey
ALTER TABLE "skill_lessons" ADD CONSTRAINT "skill_lessons_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "skill_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lesson_progress" ADD CONSTRAINT "skill_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lesson_progress" ADD CONSTRAINT "skill_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "skill_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_path_completions" ADD CONSTRAINT "skill_path_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_path_completions" ADD CONSTRAINT "skill_path_completions_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "skill_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
