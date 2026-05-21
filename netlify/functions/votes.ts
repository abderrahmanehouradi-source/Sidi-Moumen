import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { neighborhoodVotes, deviceVotes } from "../../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

const NEIGHBORHOODS = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

async function ensureNeighborhoodsExist() {
  const values = NEIGHBORHOODS.map(neighborhood => ({ neighborhood, votes: 0 }));
  await db.insert(neighborhoodVotes).values(values).onConflictDoNothing();
}

export default async (req: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === "GET") {
    await ensureNeighborhoodsExist();
    const results = await db
      .select()
      .from(neighborhoodVotes)
      .orderBy(desc(neighborhoodVotes.votes));
    return Response.json(results, { headers });
  }

  if (req.method === "POST") {
    const { deviceId, neighborhood } = await req.json();

    if (!deviceId || !neighborhood || !NEIGHBORHOODS.includes(neighborhood)) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400, headers });
    }

    const existing = await db
      .select()
      .from(deviceVotes)
      .where(eq(deviceVotes.deviceId, deviceId));

    if (existing.length > 0) {
      return Response.json(
        { error: "لقد صوّت هذا الجهاز مسبقاً", votedFor: existing[0].neighborhood },
        { status: 409, headers }
      );
    }

    await ensureNeighborhoodsExist();

    await db.insert(deviceVotes).values({ deviceId, neighborhood });

    const [updated] = await db
      .update(neighborhoodVotes)
      .set({ votes: sql`${neighborhoodVotes.votes} + 1` })
      .where(eq(neighborhoodVotes.neighborhood, neighborhood))
      .returning();

    return Response.json(
      { success: true, neighborhood, votes: updated?.votes ?? 1 },
      { status: 201, headers }
    );
  }

  return new Response("Method not allowed", { status: 405, headers });
};

export const config: Config = {
  path: "/api/votes",
};
