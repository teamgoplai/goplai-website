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
      from: "Angel from GoPlai <angel@joingoplai.com>",
      reply_to: "angel@letsgoplai.com",
      to: [email],
      subject: "You're on the GoPlai waitlist!",
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

  <!-- Logo -->
  <tr><td style="padding:0 0 24px;text-align:center">
    <img src="https://joingoplai.com/public/images/goplai-logo-new.svg" alt="GoPlai" width="100" style="display:inline-block"/>
  </td></tr>

  <!-- Hero Banner -->
  <tr><td style="background:linear-gradient(135deg,#10b981 0%,#0d9669 50%,#047857 100%);border-radius:12px;padding:40px 32px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:20px;padding:6px 16px;margin-bottom:16px">
      <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">&#10003; YOU'RE ON THE LIST</span>
    </div>
    <h1 style="color:#fff;font-size:32px;font-weight:800;margin:0 0 8px;line-height:1.2">You're in!</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;line-height:1.5">You're one of the first. Welcome to the inner circle.</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:32px 32px 40px">

    <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 16px;line-height:1.3">Hey &#128075;</p>

    <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 8px">
      You just locked in early access to <strong>GoPlai</strong> &mdash; we're building the easiest way to turn a full game recording into a highlight reel, automatically.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 28px">
      We're only letting in a small group to start so we can build this alongside real sports families. As an early member, your feedback will directly shape what we ship. We'll reach out personally when your spot is ready.
    </p>

    <!-- What to Expect -->
    <p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#10b981;margin:0 0 20px">WHAT TO EXPECT</p>

    <!-- Step 1 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
    <tr>
      <td width="40" valign="top" style="padding-top:2px"><span style="font-size:22px">&#127909;</span></td>
      <td>
        <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px">Record your game</p>
        <p style="font-size:14px;color:#666;margin:0;line-height:1.6">Set up any phone or camera courtside. No special equipment needed.</p>
      </td>
    </tr>
    </table>

    <!-- Step 2 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
    <tr>
      <td width="40" valign="top" style="padding-top:2px"><span style="font-size:22px">&#129302;</span></td>
      <td>
        <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px">AI finds the highlights</p>
        <p style="font-size:14px;color:#666;margin:0;line-height:1.6">Our AI watches every minute and pulls out the best plays automatically.</p>
      </td>
    </tr>
    </table>

    <!-- Step 3 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr>
      <td width="40" valign="top" style="padding-top:2px"><span style="font-size:22px">&#127916;</span></td>
      <td>
        <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px">Get your highlight reel</p>
        <p style="font-size:14px;color:#666;margin:0;line-height:1.6">Receive a ready-to-share reel and individual clips of every key moment.</p>
      </td>
    </tr>
    </table>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 24px"/>

    <!-- WhatsApp CTA -->
    <p style="font-size:15px;color:#444;text-align:center;margin:0 0 16px">Join our early access community on WhatsApp:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-bottom:20px">
    <tr><td style="background:#10b981;border-radius:8px;text-align:center">
      <a href="https://chat.whatsapp.com/Fx10fdn77e51flQ34HnCPr?mode=gi_t" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">Join WhatsApp Group &rarr;</a>
    </td></tr>
    </table>

    <!-- Referral CTA -->
    <p style="font-size:15px;color:#444;text-align:center;margin:0 0 16px">Know a sports parent who should be in on this early?</p>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
    <tr><td style="background:#10b981;border-radius:8px;text-align:center">
      <a href="https://joingoplai.com" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">Share GoPlai &rarr;</a>
    </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 8px 0;text-align:center">
    <p style="font-size:12px;color:#999;margin:0 0 4px;line-height:1.6">
      You're receiving this because you signed up at <a href="https://joingoplai.com" style="color:#999">joingoplai.com</a>.
    </p>
    <p style="font-size:12px;color:#999;margin:0;line-height:1.6">
      Questions? Reply to this email or reach us at <a href="mailto:angel@joingoplai.com" style="color:#999">angel@joingoplai.com</a>.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>
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
