import { createClient } from "@libsql/client";

const url = process.env.TURSO_URL || process.env.DATABASE_URL || "";
const token = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || "";

const client = createClient({
  url: url.startsWith("libsql") ? url : "file:./db/local.db",
  authToken: url.startsWith("libsql") ? token : undefined,
});

async function query(sql: string, args: any[] = []) {
  const r = await client.execute({ sql, args: args.filter(a => a !== undefined) });
  return r.rows;
}

async function execute(sql: string, args: any[] = []) {
  return await client.execute({ sql, args: args.filter(a => a !== undefined) });
}

export const db = {
  gymLead: {
    count: async () => {
      const rows = await query("SELECT COUNT(*) as count FROM GymLead");
      return Number((rows[0] as any)?.count || 0);
    },
    findMany: async (opts?: any) => {
      let sql = "SELECT * FROM GymLead";
      const args: any[] = [];
      const conditions: string[] = [];
      if (opts?.where) {
        if (opts.where.status) { conditions.push("status = ?"); args.push(opts.where.status); }
        if (opts.where.region) { conditions.push("region = ?"); args.push(opts.where.region); }
        if (opts.where.country) { conditions.push("country = ?"); args.push(opts.where.country); }
        if (opts.where.priority) { conditions.push("priority = ?"); args.push(opts.where.priority); }
        if (opts.where.instagram) { conditions.push("instagram = ?"); args.push(opts.where.instagram); }
        if (opts.where.message !== undefined && opts.where.message === null) conditions.push("message IS NULL");
        if (opts.where.emailMessage !== undefined && opts.where.emailMessage === null) conditions.push("emailMessage IS NULL");
      }
      if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
      sql += " ORDER BY createdAt DESC";
      if (opts?.take) sql += " LIMIT " + opts.take;
      const rows = await query(sql, args);
      return rows.map((row: any) => ({
        id: row.id, name: row.name, instagram: row.instagram,
        city: row.city, region: row.region, country: row.country,
        disciplines: row.disciplines, status: row.status,
        priority: row.priority, notes: row.notes, detail: row.detail,
        message: row.message, emailMessage: row.emailMessage,
        contactedAt: row.contactedAt, followUpAt: row.followUpAt,
        createdAt: row.createdAt, updatedAt: row.updatedAt,
      }));
    },
    findUnique: async (opts: any) => {
      if (opts.where.id) {
        const rows = await query("SELECT * FROM GymLead WHERE id = ?", [opts.where.id]);
        return rows[0] || null;
      }
      if (opts.where.instagram) {
        const rows = await query("SELECT * FROM GymLead WHERE instagram = ?", [opts.where.instagram]);
        return rows[0] || null;
      }
      return null;
    },
    findFirst: async (opts: any) => {
      if (opts.where.instagram) {
        const rows = await query("SELECT * FROM GymLead WHERE instagram = ?", [opts.where.instagram]);
        return rows[0] || null;
      }
      return null;
    },
    create: async (opts: any) => {
      const d = opts.data;
      const id = crypto.randomUUID();
      await execute(
        "INSERT INTO GymLead (id, name, instagram, city, region, country, disciplines, status, priority, notes, detail, message, emailMessage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, d.name, d.instagram, d.city || null, d.region || null, d.country || "UK", d.disciplines || "", d.status || "new", d.priority || "medium", d.notes || null, d.detail || null, d.message || null, d.emailMessage || null]
      );
      return { id, ...d };
    },
    update: async (opts: any) => {
      const sets: string[] = [];
      const args: any[] = [];
      const d = opts.data;
      if (d.status !== undefined) { sets.push("status = ?"); args.push(d.status); }
      if (d.priority !== undefined) { sets.push("priority = ?"); args.push(d.priority); }
      if (d.notes !== undefined) { sets.push("notes = ?"); args.push(d.notes); }
      if (d.detail !== undefined) { sets.push("detail = ?"); args.push(d.detail); }
      if (d.country !== undefined) { sets.push("country = ?"); args.push(d.country); }
      if (d.message !== undefined) { sets.push("message = ?"); args.push(d.message); }
      if (d.emailMessage !== undefined) { sets.push("emailMessage = ?"); args.push(d.emailMessage); }
      if (d.contactedAt !== undefined) { sets.push("contactedAt = ?"); args.push(d.contactedAt); }
      sets.push("updatedAt = datetime('now')");
      args.push(opts.where.id);
      await execute("UPDATE GymLead SET " + sets.join(", ") + " WHERE id = ?", args);
      const rows = await query("SELECT * FROM GymLead WHERE id = ?", [opts.where.id]);
      return rows[0] || null;
    },
    delete: async (opts: any) => {
      await execute("DELETE FROM GymLead WHERE id = ?", [opts.where.id]);
      return { ok: true };
    },
    updateMany: async (opts: any) => {
      const sets: string[] = [];
      const args: any[] = [];
      if (opts.data.country !== undefined) { sets.push("country = ?"); args.push(opts.data.country); }
      if (opts.data.message !== undefined) { sets.push("message = ?"); args.push(opts.data.message); }
      if (opts.data.emailMessage !== undefined) { sets.push("emailMessage = ?"); args.push(opts.data.emailMessage); }
      let sql = "UPDATE GymLead SET " + sets.join(", ");
      if (opts.where && opts.where.country === null) sql += " WHERE country IS NULL";
      const r = await execute(sql, args);
      return { count: (r as any).rowsAffected || 0 };
    },
    groupBy: async (opts: any) => {
      const by = opts.by[0];
      const rows = await query(`SELECT ${by}, COUNT(*) as _count FROM GymLead GROUP BY ${by}`);
      return rows.map((r: any) => ({ [by]: r[by], _count: Number(r._count) }));
    },
  },
  restaurantLead: {
    count: async () => {
      const rows = await query("SELECT COUNT(*) as count FROM RestaurantLead");
      return Number((rows[0] as any)?.count || 0);
    },
    findMany: async (opts?: any) => {
      let sql = "SELECT * FROM RestaurantLead";
      const args: any[] = [];
      const conditions: string[] = [];
      if (opts?.where) {
        if (opts.where.status) { conditions.push("status = ?"); args.push(opts.where.status); }
        if (opts.where.country) { conditions.push("country = ?"); args.push(opts.where.country); }
        if (opts.where.priority) { conditions.push("priority = ?"); args.push(opts.where.priority); }
        if (opts.where.message !== undefined && opts.where.message === null) conditions.push("message IS NULL");
        if (opts.where.emailMessage !== undefined && opts.where.emailMessage === null) conditions.push("emailMessage IS NULL");
      }
      if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
      sql += " ORDER BY createdAt DESC";
      if (opts?.take) sql += " LIMIT " + opts.take;
      return await query(sql, args);
    },
    findUnique: async (opts: any) => {
      if (opts.where.id) {
        const rows = await query("SELECT * FROM RestaurantLead WHERE id = ?", [opts.where.id]);
        return rows[0] || null;
      }
      if (opts.where.instagram) {
        const rows = await query("SELECT * FROM RestaurantLead WHERE instagram = ?", [opts.where.instagram]);
        return rows[0] || null;
      }
      return null;
    },
    findFirst: async (opts: any) => {
      if (opts.where.instagram) {
        const rows = await query("SELECT * FROM RestaurantLead WHERE instagram = ?", [opts.where.instagram]);
        return rows[0] || null;
      }
      if (opts.where.name && opts.where.city) {
        const rows = await query("SELECT * FROM RestaurantLead WHERE name = ? AND city = ?", [opts.where.name, opts.where.city]);
        return rows[0] || null;
      }
      return null;
    },
    create: async (opts: any) => {
      const d = opts.data;
      const id = crypto.randomUUID();
      await execute(
        "INSERT INTO RestaurantLead (id, name, instagram, phone, city, region, country, cuisine, hasWebsite, reservationSystem, botDeployed, status, priority, notes, detail, message, emailMessage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, d.name, d.instagram || null, d.phone || null, d.city || null, d.region || null, d.country || "UK", d.cuisine || null, d.hasWebsite ? 1 : 0, d.reservationSystem || null, d.botDeployed ? 1 : 0, d.status || "new", d.priority || "medium", d.notes || null, d.detail || null, d.message || null, d.emailMessage || null]
      );
      return { id, ...d };
    },
    update: async (opts: any) => {
      const sets: string[] = [];
      const args: any[] = [];
      const d = opts.data;
      if (d.status !== undefined) { sets.push("status = ?"); args.push(d.status); }
      if (d.priority !== undefined) { sets.push("priority = ?"); args.push(d.priority); }
      if (d.notes !== undefined) { sets.push("notes = ?"); args.push(d.notes); }
      if (d.detail !== undefined) { sets.push("detail = ?"); args.push(d.detail); }
      if (d.country !== undefined) { sets.push("country = ?"); args.push(d.country); }
      if (d.message !== undefined) { sets.push("message = ?"); args.push(d.message); }
      if (d.emailMessage !== undefined) { sets.push("emailMessage = ?"); args.push(d.emailMessage); }
      if (d.contactedAt !== undefined) { sets.push("contactedAt = ?"); args.push(d.contactedAt); }
      sets.push("updatedAt = datetime('now')");
      args.push(opts.where.id);
      await execute("UPDATE RestaurantLead SET " + sets.join(", ") + " WHERE id = ?", args);
      const rows = await query("SELECT * FROM RestaurantLead WHERE id = ?", [opts.where.id]);
      return rows[0] || null;
    },
    delete: async (opts: any) => {
      await execute("DELETE FROM RestaurantLead WHERE id = ?", [opts.where.id]);
      return { ok: true };
    },
    groupBy: async (opts: any) => {
      const by = opts.by[0];
      const rows = await query(`SELECT ${by}, COUNT(*) as _count FROM RestaurantLead GROUP BY ${by}`);
      return rows.map((r: any) => ({ [by]: r[by], _count: Number(r._count) }));
    },
  },
  $disconnect: async () => {},
};
