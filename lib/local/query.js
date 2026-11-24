// A tiny chainable query builder that mimics the parts of supabase-js the app uses.
// It only describes the query; `exec` decides where it runs (browser -> API, server -> JSON store).
export class Query {
  constructor(table, exec) {
    this.exec = exec;
    this.p = { table, op: 'select', select: '*', filters: [], order: [], opts: {} };
  }
  select(cols = '*', opts = {}) {
    if (this.p.op === 'select') { this.p.select = cols; this.p.opts = opts; } else this.p.returning = cols;
    return this;
  }
  insert(v) { this.p.op = 'insert'; this.p.values = v; return this; }
  update(v) { this.p.op = 'update'; this.p.values = v; return this; }
  upsert(v, o = {}) { this.p.op = 'upsert'; this.p.values = v; this.p.onConflict = o.onConflict; return this; }
  delete() { this.p.op = 'delete'; return this; }
  eq(c, v) { this.p.filters.push(['eq', c, v]); return this; }
  neq(c, v) { this.p.filters.push(['neq', c, v]); return this; }
  in(c, v) { this.p.filters.push(['in', c, v]); return this; }
  is(c, v) { this.p.filters.push(['is', c, v]); return this; }
  order(c, o = {}) { this.p.order.push({ col: c, ascending: o.ascending !== false }); return this; }
  limit(n) { this.p.limit = n; return this; }
  single() { this.p.single = 'single'; return this; }
  maybeSingle() { this.p.single = 'maybe'; return this; }
  then(a, b) { return Promise.resolve(this.exec(this.p)).then(a, b); }
}
