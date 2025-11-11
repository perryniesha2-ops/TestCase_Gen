// app/api/send-support-email/route.ts
export const runtime = "nodejs"; // Resend needs Node runtime (not edge)

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

type Payload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  hp?: string;
};

function clean(v: unknown, max = 8000) {
  return String(v ?? "").slice(0, max);
}

// This must be exported with the exact name POST
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Payload> | null;
    if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const subject = clean(body.subject);
    const message = clean(body.message);
    const hp = clean(body.hp);

    // Honeypot
    if (hp.trim() !== "") return Response.json({ ok: true });

    if (!name || !email || !subject || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif">
      <h2>New Support Message</h2>
      <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <pre style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:8px;border:1px solid #e5e7eb">${message}</pre>
    </div>`;
    const text = `New Support Message
From: ${name} <${email}>
Subject: ${subject}

${message}
`;

    const { data, error } = await resend.emails.send({
      from: "Synth QA <support@synthqa.app>",
      to: ["support@synthqa.app"],
      // replyTo: email, // optional: forward replies to sender
      subject: `[Support] ${subject}`,
      html,
      text,
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: data?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Optional: explicitly block GET so hitting the URL in the browser shows 405
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
