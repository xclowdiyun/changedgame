// Discord Embedded App SDK glue. Does nothing when the page is opened in a normal browser.
// Inside Discord it calls sdk.ready() (otherwise Discord shows a loading screen forever)
// and, if DISCORD_CLIENT_SECRET is set in backend/.env, signs the player in to get their name.
window.initDiscord = async function initDiscord() {
  if (!new URLSearchParams(location.search).has('frame_id')) return; // not inside Discord
  try {
    const config = await (await fetch('/api/config', { cache: 'no-store' })).json();
    const clientId = config.discord_client_id;
    if (!clientId) {
      console.warn('DISCORD_CLIENT_ID is empty in backend/.env; skipping Discord SDK.');
      return;
    }
    const { DiscordSDK } = await import('/vendor/discord-sdk.mjs');
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    window.discordSdk = sdk;
    try {
      const { code } = await sdk.commands.authorize({
        client_id: clientId,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: ['identify'],
      });
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error(`/api/token HTTP ${response.status}`);
      const { access_token: accessToken } = await response.json();
      const auth = await sdk.commands.authenticate({ access_token: accessToken });
      window.discordUser = { id: auth.user.id, name: auth.user.global_name || auth.user.username };
    } catch (error) {
      console.warn('Discord sign-in skipped (players will get random names):', error);
    }
  } catch (error) {
    console.error('Discord SDK failed to start:', error);
  }
};
