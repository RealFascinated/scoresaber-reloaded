console.log("[patch] drizzle sqlToQuery instrumented");
import { PgDialect } from "drizzle-orm/pg-core";
const stats = new Map<string, { n: number; ms: number; len: number }>();
const orig = PgDialect.prototype.sqlToQuery;
PgDialect.prototype.sqlToQuery = function (this: PgDialect, ...args: Parameters<typeof orig>) {
  const t = performance.now();
  const r = orig.apply(this, args);
  const ms = performance.now() - t;
  const key = r.sql
    .replace(/\$\d+/g, "$")
    .replace(/\(\$(, \$)*\)(, \(\$(, \$)*\))*/g, "(..)")
    .slice(0, 140);
  const s = stats.get(key) ?? { n: 0, ms: 0, len: 0 };
  s.n++;
  s.ms += ms;
  s.len += r.sql.length;
  stats.set(key, s);
  return r;
};
setInterval(() => {
  const rows = [...stats].sort((a, b) => b[1].ms - a[1].ms).slice(0, 25);
  const lines = rows.map(
    ([k, s]) =>
      `${s.ms.toFixed(0).padStart(7)}ms n=${String(s.n).padStart(6)} per=${((s.ms / s.n) * 1000).toFixed(0).padStart(5)}us len=${Math.round(s.len / s.n)} ${k}`
  );
  require("node:fs").writeFileSync("/tmp/ssr-prof/sqlbuild-stats.txt", lines.join("\n"));
}, 5000);
