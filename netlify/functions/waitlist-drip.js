// Scheduled function that fires waitlist drip emails.
//
// Runs daily (see netlify.toml [functions."waitlist-drip"]).
// Sends two drip emails:
//   - Email #3 (nudge_1): 7 days after signup, no prior activation
//   - Email #4 (nudge_2): 7 days after nudge_1, no response
//
// Gated by DRIP_ENABLED env var — when unset/false, runs in DRY_RUN mode and
// logs what it would send without actually calling Resend.

const SUPABASE_URL = "https://cajdlgfdesedrkdozecb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhamRsZ2ZkZXNlZHJrZG96ZWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTk0MDksImV4cCI6MjA5MDYzNTQwOX0.MY40agAjjM7xdYaVWaCFSOkRoqzC_OW1OM3vhMEjm8Y";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DRIP_ENABLED = process.env.DRIP_ENABLED === "true";

// Emails we never drip to (founders, test accounts)
const EXCLUDE_EMAILS = new Set([
  "atramontin@berkeley.edu",
  "angeltramontin01@gmail.com",
  "gonzalovasquezneyra@gmail.com",
  "gonzalo.vasquez@berkeley.edu",
  "perftest-bench@example.com",
  "dede@gmail.com",
]);

const VIDEO_LINK = "https://player.videodb.io/watch?v=LPJ7bya7sc0";
const THUMBNAIL_URL = "https://joingoplai.com/public/email-assets/onboarding-thumbnail.png";
const LOGO_URL = "https://joingoplai.com/public/email-assets/goplai-logo.png";
const WHATSAPP_LINK = "https://chat.whatsapp.com/Fx10fdn77e51flQ34HnCPr?mode=gi_t";
const APP_URL = "https://letsgoplai.com";

async function callRpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fn} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function firstNameFromEmail(email) {
  const local = email.split("@")[0];
  const first = local.split(/[._-]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

async function sendEmail({ to, subject, html }) {
  if (!DRIP_ENABLED) {
    console.log(`[DRY RUN] Would send to ${to}: ${subject}`);
    return { dryRun: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Angel Tramontin <angel@joingoplai.com>",
      reply_to: "angel@letsgoplai.com",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed for ${to}: ${res.status} ${text}`);
  }
  return await res.json();
}

// ─── EMAIL #3 — 7-day nudge ──────────────────────────────────────────
function buildNudge1Html(firstName) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6;font-size:15px">
  <p style="text-align:center;margin:0 0 32px 0">
    <img src="${LOGO_URL}" alt="GoPlai" width="80" style="width:80px;height:auto;display:inline-block"/>
  </p>

  <p>Hey ${firstName},</p>

  <p>Quick follow-up — I sent you a walkthrough a week ago for <strong>GoPlai</strong>, the tool that turns your basketball game footage into highlight reels automatically.</p>

  <p>No pressure, but I figured you might have missed it. Here's the 2-minute walkthrough again:</p>

  <p style="margin:24px 0">
    <a href="${VIDEO_LINK}" style="text-decoration:none">
      <img src="${THUMBNAIL_URL}" alt="Watch the GoPlai walkthrough" width="480" style="width:100%;max-width:480px;display:block;border-radius:12px"/>
    </a>
  </p>

  <p><strong>Why it's worth 2 minutes:</strong></p>
  <ul style="padding-left:20px;margin:0 0 16px">
    <li>Upload a game → get a highlight reel in 10 minutes</li>
    <li>AI finds every bucket, block, and nice pass automatically</li>
    <li>Share clips straight to your group chat or tag teammates</li>
    <li>Free to try with your first game</li>
  </ul>

  <p>The next time you play pickup or rec league, just prop your phone on a tripod and hit record. Upload at <a href="${APP_URL}" style="color:#B7FB5F">letsgoplai.com</a> and you'll see what I mean.</p>

  <p style="margin:24px 0;padding:16px;background:#f0faf4;border-radius:10px;border-left:4px solid #B7FB5F">
    <strong>Want direct access to the founders?</strong><br/>
    <span style="font-size:14px;color:#444">Join our early access WhatsApp group — give feedback, ask questions, chat with other players.</span><br/>
    <a href="${WHATSAPP_LINK}" style="display:inline-block;margin-top:8px;color:#25D366;font-weight:600;text-decoration:none">Join the group →</a>
  </p>

  <p>— Angel</p>
  <p style="color:#666;font-size:13px">P.S. If GoPlai isn't for you, no worries — just reply and I'll stop emailing.</p>
</div>`;
}

// ─── EMAIL #4 — 14-day final nudge ────────────────────────────────────
function buildNudge2Html(firstName) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6;font-size:15px">
  <p style="text-align:center;margin:0 0 32px 0">
    <img src="${LOGO_URL}" alt="GoPlai" width="80" style="width:80px;height:auto;display:inline-block"/>
  </p>

  <p>Hey ${firstName},</p>

  <p>Last one from me, I promise.</p>

  <p>I know inboxes are noisy, so here's the short version of why GoPlai might be worth 10 minutes of your time:</p>

  <p style="margin:20px 0;padding:20px;background:#000000;border-radius:12px;color:#ffffff">
    <strong style="color:#B7FB5F;font-size:13px;letter-spacing:1px;text-transform:uppercase">What actually happens</strong><br/>
    <span style="font-size:15px;line-height:1.7">
      You upload a 90-minute pickup game.<br/>
      Our AI watches every frame.<br/>
      10 minutes later you get a highlight reel of every bucket, block, and nice play — plus individual clips you can share.<br/>
      <br/>
      <em style="color:#B7FB5F">That's it. No editing. No effort.</em>
    </span>
  </p>

  <p style="margin:24px 0">
    <a href="${VIDEO_LINK}" style="text-decoration:none">
      <img src="${THUMBNAIL_URL}" alt="Watch the 2-minute walkthrough" width="480" style="width:100%;max-width:480px;display:block;border-radius:12px"/>
    </a>
  </p>

  <p>If it sounds cool, the next time you play just set your phone on a tripod behind the baseline and hit record. Upload at <a href="${APP_URL}" style="color:#B7FB5F;font-weight:600">letsgoplai.com</a>.</p>

  <p>If it doesn't sound cool, no worries — I won't email you again about this. If you ever have thoughts on how we could make it more useful, hit reply. I read everything.</p>

  <p>— Angel</p>
  <p style="color:#666;font-size:13px">P.S. If you know a rec/pickup player who might be into this, forwarding this email is the best compliment you can give us.</p>
</div>`;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────
export default async function handler(req) {
  if (!RESEND_API_KEY && DRIP_ENABLED) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
  }

  const results = {
    mode: DRIP_ENABLED ? "LIVE" : "DRY_RUN",
    nudge_1: { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: [] },
    nudge_2: { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: [] },
  };

  try {
    // ─── Nudge 1 ─────────────────────────────────────────────────────
    const nudge1Candidates = await callRpc("get_nudge_1_candidates");

    for (const row of nudge1Candidates) {
      const { email } = row;
      results.nudge_1.attempted += 1;

      if (EXCLUDE_EMAILS.has(email.toLowerCase())) {
        results.nudge_1.skipped += 1;
        continue;
      }

      const firstName = firstNameFromEmail(email);

      try {
        await sendEmail({
          to: email,
          subject: "Your first highlight reel is waiting",
          html: buildNudge1Html(firstName),
        });

        if (DRIP_ENABLED) {
          await callRpc("record_email_event", {
            p_email: email,
            p_event_type: "nudge_1",
            p_metadata: { first_name: firstName },
          });
        }
        results.nudge_1.sent += 1;
      } catch (err) {
        results.nudge_1.failed += 1;
        results.nudge_1.errors.push(`${email}: ${err.message}`);
      }
    }

    // ─── Nudge 2 ─────────────────────────────────────────────────────
    const nudge2Candidates = await callRpc("get_nudge_2_candidates");

    for (const row of nudge2Candidates) {
      const { email } = row;
      results.nudge_2.attempted += 1;

      if (EXCLUDE_EMAILS.has(email.toLowerCase())) {
        results.nudge_2.skipped += 1;
        continue;
      }

      const firstName = firstNameFromEmail(email);

      try {
        await sendEmail({
          to: email,
          subject: "Here's exactly what GoPlai does (last email)",
          html: buildNudge2Html(firstName),
        });

        if (DRIP_ENABLED) {
          await callRpc("record_email_event", {
            p_email: email,
            p_event_type: "nudge_2",
            p_metadata: { first_name: firstName },
          });
        }
        results.nudge_2.sent += 1;
      } catch (err) {
        results.nudge_2.failed += 1;
        results.nudge_2.errors.push(`${email}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Drip error:", err);
    return new Response(JSON.stringify({ error: err.message, results }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Runs once per day at 9am UTC (2am PT / 5am ET)
export const config = {
  schedule: "0 9 * * *",
};
