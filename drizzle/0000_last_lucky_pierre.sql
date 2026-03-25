CREATE TABLE "code_switches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"conversation_id" uuid,
	"gap_word" text NOT NULL,
	"target_equiv" text,
	"times_used" integer DEFAULT 1 NOT NULL,
	"promoted_to_vocab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"lesson_id" uuid,
	"scenario" text,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"analysis" jsonb,
	"srs_updates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pin" text,
	"target_language" text NOT NULL,
	"lesson_language" text NOT NULL,
	"cefr_level" text DEFAULT 'A1' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"cefr_level" text NOT NULL,
	"week" integer,
	"day" integer,
	"theme" text,
	"plan" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"lesson_id" uuid,
	"quiz_type" text NOT NULL,
	"questions" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"score" real,
	"srs_updates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"word" text NOT NULL,
	"romanization" text,
	"cefr_level" text NOT NULL,
	"sm2_repetition" integer DEFAULT 0 NOT NULL,
	"sm2_interval" integer DEFAULT 0 NOT NULL,
	"sm2_ef" real DEFAULT 2.5 NOT NULL,
	"next_review" timestamp with time zone DEFAULT now() NOT NULL,
	"modality_scores" jsonb DEFAULT '{"listening":0,"speaking":0,"contextual":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "code_switches" ADD CONSTRAINT "code_switches_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_switches" ADD CONSTRAINT "code_switches_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "code_switches_learner_id_gap_word_unique" ON "code_switches" USING btree ("learner_id","gap_word");--> statement-breakpoint
CREATE INDEX "code_switches_learner_id_times_used_desc_idx" ON "code_switches" USING btree ("learner_id","times_used" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_learner_id_word_unique" ON "vocabulary" USING btree ("learner_id","word");--> statement-breakpoint
CREATE INDEX "vocabulary_learner_id_next_review_idx" ON "vocabulary" USING btree ("learner_id","next_review");--> statement-breakpoint
CREATE INDEX "vocabulary_learner_id_cefr_level_idx" ON "vocabulary" USING btree ("learner_id","cefr_level");