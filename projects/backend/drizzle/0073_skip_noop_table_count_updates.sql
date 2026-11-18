-- Skip the counter write when a statement changed no rows.
--
-- Upserts that conflict on every row (ON CONFLICT DO NOTHING, e.g. leaderboard
-- page views re-submitting known scores) still fire the AFTER INSERT statement
-- trigger with an empty transition table. It then ran UPDATE "ssr_table_counts"
-- WHERE "id" = 1 with a zero delta, which takes the row lock on the single
-- counter row and serializes every concurrent writer until commit.
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

	IF delta = 0 AND inactive_delta = 0 THEN
		RETURN NULL;
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
$$ LANGUAGE plpgsql;
