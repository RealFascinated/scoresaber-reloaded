ALTER TABLE "ssr_table_counts" ADD COLUMN IF NOT EXISTS "scoresaberInactiveAccounts" bigint NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "ssr_table_counts"
SET "scoresaberInactiveAccounts" = (SELECT COUNT(*)::bigint FROM "scoresaber-accounts" WHERE "inactive" = true)
WHERE "id" = 1;--> statement-breakpoint
ALTER TABLE "ssr_table_counts" ALTER COLUMN "scoresaberInactiveAccounts" DROP DEFAULT;--> statement-breakpoint
CREATE OR REPLACE FUNCTION ssr_adjust_table_count()
RETURNS TRIGGER AS $$
DECLARE
	delta bigint := CASE WHEN TG_OP = 'INSERT' THEN 1 WHEN TG_OP = 'DELETE' THEN -1 ELSE 0 END;
BEGIN
	IF TG_TABLE_NAME = 'scoresaber-accounts' THEN
		IF TG_OP = 'INSERT' THEN
			UPDATE "ssr_table_counts"
			SET
				"scoresaberAccounts" = "scoresaberAccounts" + 1,
				"scoresaberInactiveAccounts" = "scoresaberInactiveAccounts" + CASE WHEN NEW."inactive" THEN 1 ELSE 0 END
			WHERE "id" = 1;
		ELSIF TG_OP = 'DELETE' THEN
			UPDATE "ssr_table_counts"
			SET
				"scoresaberAccounts" = "scoresaberAccounts" - 1,
				"scoresaberInactiveAccounts" = "scoresaberInactiveAccounts" - CASE WHEN OLD."inactive" THEN 1 ELSE 0 END
			WHERE "id" = 1;
		ELSIF TG_OP = 'UPDATE' THEN
			IF OLD."inactive" IS DISTINCT FROM NEW."inactive" THEN
				UPDATE "ssr_table_counts"
				SET "scoresaberInactiveAccounts" = "scoresaberInactiveAccounts" + CASE WHEN NEW."inactive" THEN 1 ELSE -1 END
				WHERE "id" = 1;
			END IF;
		END IF;

		RETURN COALESCE(NEW, OLD);
	END IF;

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
	ELSIF TG_TABLE_NAME = 'scoresaber-leaderboards' THEN
		UPDATE "ssr_table_counts"
		SET "scoresaberLeaderboards" = "scoresaberLeaderboards" + delta
		WHERE "id" = 1;
	END IF;

	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "ssr_table_counts_accounts_trigger" ON "scoresaber-accounts";--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_accounts_trigger"
AFTER INSERT OR DELETE OR UPDATE OF "inactive" ON "scoresaber-accounts"
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
		"scoresaberInactiveAccounts" = (SELECT COUNT(*)::bigint FROM "scoresaber-accounts" WHERE "inactive" = true),
		"scoresaberLeaderboards" = (SELECT COUNT(*)::bigint FROM "scoresaber-leaderboards"),
		"refreshedAt" = now()
	WHERE "id" = 1;
END;
$$ LANGUAGE plpgsql;
