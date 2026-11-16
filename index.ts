import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("JOYVELOPE_ALLOWED_ORIGIN");
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin ?? "null",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
const digest = async (value: string) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const safeGift = (input: any) => {
  if (!input || typeof input !== "object" || !["birthday", "letter", "memories"].includes(input.template)) throw new Error("Invalid gift");
  if (typeof input.recipient !== "string" || input.recipient.length > 50) throw new Error("Invalid recipient");
  if (typeof input.title !== "string" || input.title.length > 70 || typeof input.message !== "string" || input.message.length > 1200) throw new Error("Invalid gift text");
  const memories = Array.isArray(input.memories) ? input.memories.slice(0, 3).map((v: unknown) => typeof v === "string" ? v.slice(0, 110) : "") : ["", "", ""];
  return { template: input.template, title: input.title, recipient: input.recipient, sender: typeof input.sender === "string" ? input.sender.slice(0, 50) : "", message: input.message, memories, theme: ["sunset", "moon", "rose"].includes(input.theme) ? input.theme : "sunset", sound: ["dream", "sparkle"].includes(input.sound) ? input.sound : "none", created: Date.now(), photos: [] };
};

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (allowedOrigin && origin && origin !== allowedOrigin) return respond({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond({ error: "Gift service is not configured" }, 503);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const body = await request.json();
    const action = body.action;
    if (action === "cleanup") {
      const cleanupSecret = Deno.env.get("JOYVELOPE_CLEANUP_SECRET");
      if (!cleanupSecret || request.headers.get("authorization") !== `Bearer ${cleanupSecret}`) return respond({ error: "Not authorized" }, 401);
      const { data: expired, error: listError } = await db.from("joyvelope_gifts").select("id").lte("expires_at", new Date().toISOString()).limit(100);
      if (listError) throw listError;
      for (const row of expired ?? []) {
        await db.storage.from("joyvelope-private").remove(Array.from({ length: 6 }, (_, i) => `${row.id}/${i}.jpg`));
        const { error: removeError } = await db.from("joyvelope_gifts").delete().eq("id", row.id);
        if (removeError) throw removeError;
      }
      return respond({ removed: expired?.length ?? 0 });
    }
    if (action === "create") {
      const gift = safeGift(body.gift);
      const photoCount = Number(body.photoCount);
      if (!Number.isInteger(photoCount) || photoCount < 0 || photoCount > 6) return respond({ error: "Choose up to six photos" }, 400);
      const token = randomToken();
      const revokeToken = randomToken();
      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await db.from("joyvelope_gifts").insert({ id, token_hash: await digest(token), revoke_hash: await digest(revokeToken), payload: gift, photo_count: photoCount, expires_at: expiresAt });
      if (error) throw error;
      return respond({ token, revokeToken, expiresAt });
    }

    if (action === "upload") {
      const revokeToken = String(body.revokeToken || "");
      const index = Number(body.index);
      if (!revokeToken || !Number.isInteger(index) || index < 0 || index > 5 || typeof body.photo !== "string" || body.photo.length > 2_800_000) return respond({ error: "Invalid photo upload" }, 400);
      const match = body.photo.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return respond({ error: "Only resized JPEG photos are accepted" }, 400);
      const { data: row, error } = await db.from("joyvelope_gifts").select("id,photo_count,expires_at").eq("revoke_hash", await digest(revokeToken)).maybeSingle();
      if (error || !row || new Date(row.expires_at).getTime() <= Date.now() || index >= row.photo_count) return respond({ error: "Gift is unavailable" }, 404);
      const binary = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
      const { error: uploadError } = await db.storage.from("joyvelope-private").upload(`${row.id}/${index}.jpg`, binary, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      return respond({ ok: true });
    }

    if (action === "read") {
      const token = String(body.token || "");
      if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return respond({ error: "Gift is unavailable" }, 404);
      const { data: row, error } = await db.from("joyvelope_gifts").select("id,payload,photo_count,expires_at").eq("token_hash", await digest(token)).maybeSingle();
      if (error || !row || new Date(row.expires_at).getTime() <= Date.now()) return respond({ error: "Gift is unavailable or expired" }, 404);
      const photos: string[] = [];
      for (let i = 0; i < row.photo_count; i++) {
        const { data, error: signError } = await db.storage.from("joyvelope-private").createSignedUrl(`${row.id}/${i}.jpg`, 3600);
        if (!signError && data?.signedUrl) photos.push(data.signedUrl);
      }
      return respond({ gift: { ...row.payload, photos } });
    }

    if (action === "revoke") {
      const revokeToken = String(body.revokeToken || "");
      if (!revokeToken) return respond({ error: "Gift is unavailable" }, 404);
      const { data: row, error } = await db.from("joyvelope_gifts").select("id").eq("revoke_hash", await digest(revokeToken)).maybeSingle();
      if (error || !row) return respond({ error: "Gift is unavailable" }, 404);
      await db.storage.from("joyvelope-private").remove(Array.from({ length: 6 }, (_, i) => `${row.id}/${i}.jpg`));
      const { error: deleteError } = await db.from("joyvelope_gifts").delete().eq("id", row.id);
      if (deleteError) throw deleteError;
      return respond({ ok: true });
    }
    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Joyvelope gift request failed", error);
    return respond({ error: "Gift request failed" }, 500);
  }
});
