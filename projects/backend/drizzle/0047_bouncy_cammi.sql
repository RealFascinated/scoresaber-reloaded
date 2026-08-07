CREATE TABLE "beatleader-players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"steamId" text,
	"oculusPCId" text,
	"questId" text,
	"lastFetched" timestamp NOT NULL
);
