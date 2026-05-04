/**
 * Seeds default admin + referee accounts and a handful of demo contestants.
 * Re-run safely — checks existence before each insert.
 */
import crypto from "node:crypto";

// Node 20.6+ — load .env.local then .env (tsx doesn't auto-load).
try { process.loadEnvFile(".env.local"); } catch {}
try { process.loadEnvFile(".env"); } catch {}

import bcrypt from "bcryptjs";
import { exec, queryOne, getPool } from "../src/lib/db";
import { createContestant } from "../src/lib/contestants";

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function ensureUser(opts: {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "referee";
}) {
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    [opts.email.toLowerCase()]
  );
  if (existing) {
    console.log(`  · ${opts.role} ${opts.email} already exists`);
    return existing.id;
  }
  const id = "u_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO users (id, email, password_hash, role, full_name)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      opts.email.toLowerCase(),
      await hashPassword(opts.password),
      opts.role,
      opts.fullName,
    ]
  );
  console.log(`  ✓ created ${opts.role} ${opts.email}`);
  return id;
}

async function ensureContestant(opts: {
  email: string;
  password: string;
  fullName: string;
  stageName?: string;
  phone: string;
  age: number;
  city: string;
  category:
    | "singing"
    | "dancing"
    | "acting"
    | "comedy"
    | "instruments"
    | "other";
  experience: string;
  bio: string;
}) {
  const exists = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    [opts.email.toLowerCase()]
  );
  if (exists) {
    console.log(`  · contestant ${opts.email} already exists`);
    return;
  }
  const userId = "u_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO users (id, email, password_hash, role, full_name)
     VALUES (?, ?, ?, 'contestant', ?)`,
    [
      userId,
      opts.email.toLowerCase(),
      await hashPassword(opts.password),
      opts.fullName,
    ]
  );
  const c = await createContestant({
    userId,
    stageName: opts.stageName,
    phone: opts.phone,
    age: opts.age,
    city: opts.city,
    category: opts.category,
    experience: opts.experience,
    bio: opts.bio,
    agreedToTerms: true,
  });
  console.log(`  ✓ created contestant ${opts.email} (id ${c.id})`);
}

async function main() {
  console.log("[db-seed] seeding…");

  await ensureUser({
    email: process.env.SEED_ADMIN_EMAIL || "admin@talentquest.local",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin1234!",
    fullName: "TalentQuest Admin",
    role: "admin",
  });

  await ensureUser({
    email: process.env.SEED_REFEREE_EMAIL || "referee@talentquest.local",
    password: process.env.SEED_REFEREE_PASSWORD || "Referee1234!",
    fullName: "Senior Referee",
    role: "referee",
  });

  await ensureContestant({
    email: "hanna@example.com",
    password: "Demo1234!",
    fullName: "Hanna Tesfaye",
    stageName: "Hanna T.",
    phone: "+251911000001",
    age: 22,
    city: "Addis Ababa",
    category: "singing",
    experience: "intermediate",
    bio: "Singer-songwriter blending Tezeta scales with bedroom pop.",
  });

  await ensureContestant({
    email: "selam@example.com",
    password: "Demo1234!",
    fullName: "Selam Crew",
    phone: "+251911000002",
    age: 25,
    city: "Lalibela",
    category: "dancing",
    experience: "advanced",
    bio: "Five-piece Eskista crew putting modern footwork on tradition.",
  });

  await ensureContestant({
    email: "yonas@example.com",
    password: "Demo1234!",
    fullName: "Yonas Girma",
    phone: "+251911000003",
    age: 31,
    city: "Bahir Dar",
    category: "instruments",
    experience: "pro",
    bio: "Krar player exploring jazz inversions over pentatonic Ethio modes.",
  });

  await ensureContestant({
    email: "mikiyas@example.com",
    password: "Demo1234!",
    fullName: "Mikiyas L.",
    phone: "+251911000004",
    age: 27,
    city: "Addis Ababa",
    category: "comedy",
    experience: "intermediate",
    bio: "Stand-up comedian — taxi life, market chaos, dry observational humor.",
  });

  console.log("[db-seed] done.");
  console.log(
    "\n  Admin:    " +
      (process.env.SEED_ADMIN_EMAIL || "admin@talentquest.local") +
      " / " +
      (process.env.SEED_ADMIN_PASSWORD || "Admin1234!")
  );
  console.log(
    "  Referee:  " +
      (process.env.SEED_REFEREE_EMAIL || "referee@talentquest.local") +
      " / " +
      (process.env.SEED_REFEREE_PASSWORD || "Referee1234!") +
      "\n"
  );

  await getPool().end();
}

main().catch(async (e) => {
  console.error(e);
  try { await getPool().end(); } catch {}
  process.exit(1);
});
