-- Pins used to follow the player's score on a leaderboard, they now point at one exact score.
DELETE FROM "user-pinned-scores";--> statement-breakpoint
ALTER TABLE "user-pinned-scores" DROP CONSTRAINT "user-pinned-scores_userId_leaderboardId_pk";--> statement-breakpoint
ALTER TABLE "user-pinned-scores" DROP COLUMN "leaderboardId";--> statement-breakpoint
ALTER TABLE "user-pinned-scores" ADD COLUMN "scoreId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user-pinned-scores" ADD CONSTRAINT "user-pinned-scores_userId_scoreId_pk" PRIMARY KEY("userId","scoreId");
