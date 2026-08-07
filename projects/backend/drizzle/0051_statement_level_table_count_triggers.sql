-- Statement-level table-count triggers.
--
-- The previous row-level AFTER INSERT/DELETE triggers fired once per row and
-- each issued UPDATE "ssr_table_counts" ... WHERE "id" = 1, so every batch of
-- ingested scores serialized on the single counter row and paid N extra
-- UPDATEs. Statement-level triggers with transition tables fire once per
-- statement and compute the delta from the affected rows.
DROP TRIGGER IF EXISTS "ssr_table_counts_scores_trigger" ON "scoresaber-scores";
DROP TRIGGER IF EXISTS "ssr_table_counts_score_history_trigger" ON "scoresaber-score-history";
DROP TRIGGER IF EXISTS "ssr_table_counts_accounts_trigger" ON "scoresaber-accounts";
DROP TRIGGER IF EXISTS "ssr_table_counts_leaderboards_trigger" ON "scoresaber-leaderboards";--> statement-breakpoint
CREATE OR REPLACE FUNCTION ssr_adjust_table_count()
RETURNS TRIGGER AS $$
DECLARE
	delta bigint := 0;
	inactive_delta bigint := 0;
BEGIN
	IF TG_OP = 'INSERT' THEN
		delta := (SELECT COUNT(*)::bigint FROM new_rows);
		IF TG_TABLE_NAME = 'scoresaber-accounts' THEN
			inactive_delta := (SELECT COUNT(*)::bigint FROM new_rows WHERE "inactive");
		END IF;
	ELSIF TG_OP = 'DELETE' THEN
		delta := -(SELECT COUNT(*)::bigint FROM old_rows);
		IF TG_TABLE_NAME = 'scoresaber-accounts' THEN
			inactive_delta := -(SELECT COUNT(*)::bigint FROM old_rows WHERE "inactive");
		END IF;
	ELSIF TG_OP = 'UPDATE' THEN
		-- Fires on every accounts UPDATE; skip the counter write when the
		-- inactive flag did not actually change for any row.
		IF (SELECT COUNT(*) FROM new_rows n JOIN old_rows o USING (id)
			WHERE n."inactive" IS DISTINCT FROM o."inactive") = 0 THEN
			RETURN NULL;
		END IF;
		inactive_delta :=
			(SELECT COUNT(*)::bigint FROM new_rows WHERE "inactive") -
			(SELECT COUNT(*)::bigint FROM old_rows WHERE "inactive");
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
	ELSIF TG_TABLE_NAME = 'scoresaber-accounts' THEN
		UPDATE "ssr_table_counts"
		SET
			"scoresaberAccounts" = "scoresaberAccounts" + delta,
			"scoresaberInactiveAccounts" = "scoresaberInactiveAccounts" + inactive_delta
		WHERE "id" = 1;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "ssr_table_counts_scores_trigger" AFTER INSERT ON "scoresaber-scores"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_scores_delete_trigger" AFTER DELETE ON "scoresaber-scores"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_score_history_trigger" AFTER INSERT ON "scoresaber-score-history"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_score_history_delete_trigger" AFTER DELETE ON "scoresaber-score-history"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_leaderboards_trigger" AFTER INSERT ON "scoresaber-leaderboards"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_leaderboards_delete_trigger" AFTER DELETE ON "scoresaber-leaderboards"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_accounts_trigger" AFTER INSERT ON "scoresaber-accounts"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_accounts_delete_trigger" AFTER DELETE ON "scoresaber-accounts"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
CREATE TRIGGER "ssr_table_counts_accounts_update_trigger" AFTER UPDATE ON "scoresaber-accounts"
REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION ssr_adjust_table_count();
