DROP MATERIALIZED VIEW IF EXISTS "ssr_table_counts";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ssr_table_counts" (
	"id" integer PRIMARY KEY NOT NULL,
	"scoresaberScores" bigint NOT NULL,
	"scoresaberScoreHistory" bigint NOT NULL,
	"scoresaberAccounts" bigint NOT NULL,
	"scoresaberLeaderboards" bigint NOT NULL,
	"refreshedAt" timestamp NOT NULL
);--> statement-breakpoint
INSERT INTO "ssr_table_counts" (
	"id",
	"scoresaberScores",
	"scoresaberScoreHistory",
	"scoresaberAccounts",
	"scoresaberLeaderboards",
	"refreshedAt"
)
VALUES (
	1,
	(SELECT COUNT(*)::bigint FROM "scoresaber-scores"),
	(SELECT COUNT(*)::bigint FROM "scoresaber-score-history"),
	(SELECT COUNT(*)::bigint FROM "scoresaber-accounts"),
	(SELECT COUNT(*)::bigint FROM "scoresaber-leaderboards"),
	now()
)
ON CONFLICT ("id") DO UPDATE SET
	"scoresaberScores" = EXCLUDED."scoresaberScores",
	"scoresaberScoreHistory" = EXCLUDED."scoresaberScoreHistory",
	"scoresaberAccounts" = EXCLUDED."scoresaberAccounts",
	"scoresaberLeaderboards" = EXCLUDED."scoresaberLeaderboards",
	"refreshedAt" = EXCLUDED."refreshedAt";--> statement-breakpoint
CREATE OR REPLACE FUNCTION ssr_adjust_table_count()
RETURNS TRIGGER AS $$
DECLARE
	delta bigint := CASE WHEN TG_OP = 'INSERT' THEN 1 WHEN TG_OP = 'DELETE' THEN -1 ELSE 0 END;
BEGIN
	IF delta = 0 THEN
		RETURN COALESCE(NEW, OLD);
	END IF;

	IF TG_TABLE_NAME = 'scoresaber-scores' THEN
		UPDATE "ssr_table_counts"
		SET "scoresaberScores" = "scoresaberScores" + delta
		WHERE "id" = 1;
	ELSIF TG_TABLE_NAME = 'scoresaber-score-history' THEN
		UPDATE "ssr_table_counts"
		SET "scoresaberScoreHistory" = "scoresaberScoreHistory" + delta
		WHERE "id" = 1;
	ELSIF TG_TABLE_NAME = 'scoresaber-accounts' THEN
		UPDATE "ssr_table_counts"
		SET "scoresaberAccounts" = "scoresaberAccounts" + delta
		WHERE "id" = 1;
	ELSIF TG_TABLE_NAME = 'scoresaber-leaderboards' THEN
		UPDATE "ssr_table_counts"
		SET "scoresaberLeaderboards" = "scoresaberLeaderboards" + delta
		WHERE "id" = 1;
	END IF;

	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "ssr_table_counts_scores_trigger" ON "scoresaber-scores";--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_scores_trigger"
AFTER INSERT OR DELETE ON "scoresaber-scores"
FOR EACH ROW
EXECUTE FUNCTION ssr_adjust_table_count();--> statement-breakpoint
DROP TRIGGER IF EXISTS "ssr_table_counts_score_history_trigger" ON "scoresaber-score-history";--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_score_history_trigger"
AFTER INSERT OR DELETE ON "scoresaber-score-history"
FOR EACH ROW
EXECUTE FUNCTION ssr_adjust_table_count();--> statement-breakpoint
DROP TRIGGER IF EXISTS "ssr_table_counts_accounts_trigger" ON "scoresaber-accounts";--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_accounts_trigger"
AFTER INSERT OR DELETE ON "scoresaber-accounts"
FOR EACH ROW
EXECUTE FUNCTION ssr_adjust_table_count();--> statement-breakpoint
DROP TRIGGER IF EXISTS "ssr_table_counts_leaderboards_trigger" ON "scoresaber-leaderboards";--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_leaderboards_trigger"
AFTER INSERT OR DELETE ON "scoresaber-leaderboards"
FOR EACH ROW
EXECUTE FUNCTION ssr_adjust_table_count();--> statement-breakpoint
CREATE OR REPLACE FUNCTION reconcile_ssr_table_counts()
RETURNS void AS $$
BEGIN
	UPDATE "ssr_table_counts"
	SET
		"scoresaberScores" = (SELECT COUNT(*)::bigint FROM "scoresaber-scores"),
		"scoresaberScoreHistory" = (SELECT COUNT(*)::bigint FROM "scoresaber-score-history"),
		"scoresaberAccounts" = (SELECT COUNT(*)::bigint FROM "scoresaber-accounts"),
		"scoresaberLeaderboards" = (SELECT COUNT(*)::bigint FROM "scoresaber-leaderboards"),
		"refreshedAt" = now()
	WHERE "id" = 1;
END;
$$ LANGUAGE plpgsql;
