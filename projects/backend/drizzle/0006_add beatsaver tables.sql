CREATE TABLE "beatsaver-map-difficulties" (
	"id" serial PRIMARY KEY NOT NULL,
	"versionId" integer NOT NULL,
	"characteristic" text,
	"difficulty" text,
	"njs" double precision,
	"offset" double precision,
	"notes" integer,
	"bombs" integer,
	"obstacles" integer,
	"nps" double precision,
	"length" double precision,
	"events" integer,
	"chroma" boolean,
	"mappingExtensions" boolean,
	"noodleExtensions" boolean,
	"cinema" boolean,
	"seconds" double precision,
	"maxScore" integer,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "beatsaver-map-versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mapId" varchar(32) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"stage" text,
	"createdAt" timestamp,
	"downloadUrl" text,
	"coverUrl" text,
	"previewUrl" text
);
--> statement-breakpoint
CREATE TABLE "beatsaver-maps" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"uploaderId" integer,
	"bpm" double precision,
	"duration" integer,
	"songName" text,
	"songSubName" text,
	"songAuthorName" text,
	"songAuthorUrl" text,
	"levelAuthorName" text,
	"uploadedAt" timestamp,
	"automapper" boolean,
	"createdAt" timestamp,
	"updatedAt" timestamp,
	"lastPublishedAt" timestamp,
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "beatsaver-uploaders" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"hash" text,
	"avatar" text,
	"type" text,
	"admin" boolean,
	"curator" boolean,
	"seniorCurator" boolean,
	"verifiedMapper" boolean,
	"playlistUrl" text
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scoresaber-medal-scores" ALTER COLUMN "characteristic" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ALTER COLUMN "characteristic" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "characteristic" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "beatsaver-map-difficulties" ADD CONSTRAINT "beatsaver-map-difficulties_versionId_beatsaver-map-versions_id_fk" FOREIGN KEY ("versionId") REFERENCES "public"."beatsaver-map-versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatsaver-map-versions" ADD CONSTRAINT "beatsaver-map-versions_mapId_beatsaver-maps_id_fk" FOREIGN KEY ("mapId") REFERENCES "public"."beatsaver-maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatsaver-maps" ADD CONSTRAINT "beatsaver-maps_uploaderId_beatsaver-uploaders_id_fk" FOREIGN KEY ("uploaderId") REFERENCES "public"."beatsaver-uploaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beatsaver_map_difficulties_version_char_diff_unique" ON "beatsaver-map-difficulties" USING btree ("versionId","characteristic","difficulty");--> statement-breakpoint
CREATE INDEX "beatsaver_map_difficulties_version_id_idx" ON "beatsaver-map-difficulties" USING btree ("versionId");--> statement-breakpoint
CREATE UNIQUE INDEX "beatsaver_map_versions_hash_unique" ON "beatsaver-map-versions" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "beatsaver_map_versions_map_id_created_at_idx" ON "beatsaver-map-versions" USING btree ("mapId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "beatsaver_maps_created_at_idx" ON "beatsaver-maps" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "beatsaver_maps_tags_idx" ON "beatsaver-maps" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "beatsaver_maps_uploader_id_idx" ON "beatsaver-maps" USING btree ("uploaderId");