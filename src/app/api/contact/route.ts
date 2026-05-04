import crypto from "node:crypto";
import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  topic: z.enum(["contestant", "partnership", "press", "bug", "other"]),
  message: z.string().min(10).max(2000),
});

export const POST = route(async (req: Request) => {
  const data = await parseJson(req, Body);
  const id = "msg_" + crypto.randomBytes(6).toString("hex");
  await exec(
    `INSERT INTO contact_messages (id, name, email, topic, message)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.name, data.email.toLowerCase().trim(), data.topic, data.message]
  );
  return ok({ id, received: true });
});
