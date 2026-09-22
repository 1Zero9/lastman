import { Resend } from "resend";

const FROM = "Last Man Standing <lastman@1zero9.com>";

let client: Resend | null = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendPickReminderEmail(params: {
  to: string;
  playerName: string;
  competitionName: string;
  clubName: string | null;
  gameweekName: string;
  deadlineLabel: string;
  entryNumber: number;
  appUrl: string;
}) {
  const resend = getClient();
  if (!resend) return { sent: false, reason: "RESEND_API_KEY is not configured" as const };

  const { to, playerName, competitionName, clubName, gameweekName, deadlineLabel, entryNumber, appUrl } = params;
  const subject = `Pick reminder: ${gameweekName} closes ${deadlineLabel}`;
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #141413;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0A6B2E; margin: 0 0 8px;">${escapeHtml(clubName ?? competitionName)}</p>
      <h1 style="font-size: 20px; margin: 0 0 16px;">Hi ${escapeHtml(playerName)}, you haven't picked yet</h1>
      <p style="font-size: 14px; line-height: 22px; color: #333;">
        Entry #${entryNumber} in <strong>${escapeHtml(competitionName)}</strong> doesn't have a pick for <strong>${escapeHtml(gameweekName)}</strong> yet.
        Picks close <strong>${escapeHtml(deadlineLabel)}</strong> — miss it and you'll be auto-assigned whichever eligible team is most popular.
      </p>
      <a href="${appUrl}/my-entries" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: #0A6B2E; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px;">Make your pick</a>
      <p style="margin-top: 28px; font-size: 12px; color: #888;">Last Man Standing · unofficial fundraising tool</p>
    </div>
  `.trim();

  const result = await resend.emails.send({ from: FROM, to, subject, html });
  if (result.error) return { sent: false, reason: result.error.message };
  return { sent: true, id: result.data?.id };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
