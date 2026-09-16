/** Fires a Slack Incoming Webhook message. No-ops silently if unconfigured or on failure — never blocks the review flow. */
export async function notifySlack(text: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('Slack notify error:', err);
  }
}
