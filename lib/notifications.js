/**
 * BlogFlow - 알림 시스템 (F8)
 * — Slack / Discord Webhook 알림
 */

export async function sendNotification({ type = 'success', platform, title, postUrl, error, elapsed }) {
    const settings = getWebhookSettings();
    const promises = [];

    if (settings.slackUrl) promises.push(sendSlack(settings.slackUrl, { type, platform, title, postUrl, error, elapsed }));
    if (settings.discordUrl) promises.push(sendDiscord(settings.discordUrl, { type, platform, title, postUrl, error, elapsed }));

    if (promises.length === 0) return { sent: false, reason: 'no_webhooks' };

    const results = await Promise.allSettled(promises);
    return { sent: true, results: results.map(r => r.status) };
}

function getWebhookSettings() {
    return {
        slackUrl: process.env.SLACK_WEBHOOK_URL || '',
        discordUrl: process.env.DISCORD_WEBHOOK_URL || '',
    };
}

async function sendSlack(url, { type, platform, title, postUrl, error, elapsed }) {
    const emoji = type === 'success' ? '✅' : '❌';
    const color = type === 'success' ? '#36a64f' : '#ff0000';
    const text = type === 'success'
        ? `${emoji} *${platform}* 발행 완료 (${elapsed})\n<${postUrl}|${title}>`
        : `${emoji} *${platform}* 발행 실패\n${title}\n\`${error}\``;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            attachments: [{ color, text, ts: Math.floor(Date.now() / 1000) }],
        }),
    });
}

async function sendDiscord(url, { type, platform, title, postUrl, error, elapsed }) {
    const emoji = type === 'success' ? '✅' : '❌';
    const color = type === 'success' ? 0x36a64f : 0xff0000;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: `${emoji} BlogFlow — ${platform}`,
                description: type === 'success'
                    ? `**${title}**\n[게시물 보기](${postUrl})\n⏱️ ${elapsed}`
                    : `**${title}**\n❌ ${error}`,
                color,
                timestamp: new Date().toISOString(),
            }],
        }),
    });
}
