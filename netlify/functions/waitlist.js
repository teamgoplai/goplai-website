// Supabase publishable credentials (safe to embed — INSERT-only RLS policy)
const SUPABASE_URL = "https://cajdlgfdesedrkdozecb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhamRsZ2ZkZXNlZHJrZG96ZWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTk0MDksImV4cCI6MjA5MDYzNTQwOX0.MY40agAjjM7xdYaVWaCFSOkRoqzC_OW1OM3vhMEjm8Y";

// Secret — set in Netlify dashboard: Site Settings > Environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function insertEmail(email, source) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_emails`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, source }),
  });

  if (res.status === 409 || res.status === 23505) {
    return { duplicate: true };
  }

  if (!res.ok) {
    const text = await res.text();
    // Supabase returns 409 or a unique constraint error for duplicates
    if (text.includes("unique_email") || text.includes("duplicate key")) {
      return { duplicate: true };
    }
    throw new Error(`Supabase insert failed: ${res.status} ${text}`);
  }

  return { duplicate: false };
}

async function sendWelcomeEmail(email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GoPlai <hello@joingoplai.com>",
      to: [email],
      subject: "Welcome to GoPlai - You're on the list!",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
          <img src="https://joingoplai.com/public/images/goplai-logo.png" alt="GoPlai" width="120" style="margin-bottom:24px"/>
          <h1 style="font-size:22px;margin:0 0 12px">You're in!</h1>
          <p style="font-size:15px;line-height:1.6;color:#444">
            Thanks for signing up for early access to <strong>GoPlai</strong> — the AI-powered highlight reel generator for youth sports.
          </p>
          <p style="font-size:15px;line-height:1.6;color:#444">
            We'll reach out soon with setup instructions. In the meantime, here's what to expect:
          </p>
          <ul style="font-size:14px;line-height:1.8;color:#444;padding-left:20px">
            <li>Record your game with any phone or camera</li>
            <li>Upload it to GoPlai</li>
            <li>Get an AI-generated highlight reel in minutes</li>
          </ul>
          <p style="font-size:15px;line-height:1.6;color:#444">
            Questions? Just reply to this email.
          </p>
          <p style="font-size:14px;color:#888;margin-top:32px">
            — The GoPlai Team
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend error:", text);
    // Don't throw — email failure shouldn't block the signup
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RESEND_API_KEY) {
    console.error("Missing environment variables");
    return jsonResponse(500, { error: "Server configuration error" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const { email, source } = body;

  if (!email || typeof email !== "string") {
    return jsonResponse(400, { error: "Email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse(400, { error: "Invalid email format" });
  }

  const validSources = ["hero", "cta"];
  const cleanSource = validSources.includes(source) ? source : "unknown";

  try {
    const { duplicate } = await insertEmail(email.toLowerCase().trim(), cleanSource);

    if (!duplicate) {
      await sendWelcomeEmail(email.toLowerCase().trim());
    }

    return jsonResponse(200, {
      success: true,
      message: duplicate
        ? "You're already on the list!"
        : "You've got early access!",
      duplicate,
    });
  } catch (err) {
    console.error("Waitlist error:", err);
    return jsonResponse(500, { error: "Something went wrong. Please try again." });
  }
}

export const config = {
  path: "/api/waitlist",
};
