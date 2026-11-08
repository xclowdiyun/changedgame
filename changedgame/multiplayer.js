// WebSocket client: auto-reconnect + heartbeat (tunnels close idle sockets).
// Must live on window: game.js reads window.Multiplayer (a top-level const would not).
window.Multiplayer = (() => {
  let socket = null;
  let connected = false;
  let identity = {};
  let retryDelay = 1000;
  let retryTimer = null;
  let pingTimer = null;
  let onState = () => {};
  let onResult = () => {};
  let onError = () => {};
  let onConnection = () => {};
  let onWelcome = () => {};

  function backendUrl() {
    const configured = String(window.PET_GAME_BACKEND_URL || '').replace(/\/$/, '');
    if (configured) return configured.replace(/^http/, 'ws');
    // Same origin as the page (the Python backend also serves the page).
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }

  function open() {
    clearTimeout(retryTimer);
    socket = new WebSocket(`${backendUrl()}/ws/activity`);
    const current = socket;
    current.addEventListener('open', () => {
      connected = true;
      retryDelay = 1000;
      onConnection(true);
      // The server decides who you are; we only send a name, an optional Discord token and a resume secret.
      current.send(JSON.stringify({
        type: 'hello',
        user: { name: identity.name },
        token: identity.token || '',
        resume: identity.resume || '',
        instance: identity.instance || '',
      }));
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    });
    current.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'welcome') {
        if (message.resume) identity.resume = message.resume;
        onWelcome(message);
      }
      if (message.type === 'state') {
        onState(message.state);
        if (message.result) onResult(message.result, message.info || {});
      }
      if (message.type === 'error') onError(message.code);
    });
    current.addEventListener('close', () => {
      if (current !== socket) return;
      connected = false;
      clearInterval(pingTimer);
      onConnection(false);
      retryTimer = setTimeout(open, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 10000);
    });
    current.addEventListener('error', () => onError('connection_failed'));
  }

  function connect(user = {}) {
    identity = user;
    open();
  }

  function send(action, payload = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: 'action', action, payload }));
    return true;
  }

  function rename(name) {
    identity = { ...identity, name }; // reconnects keep the new name
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: 'rename', name }));
    return true;
  }

  return {
    connect,
    send,
    rename,
    get connected() { return connected; },
    set onState(callback) { onState = callback; },
    set onResult(callback) { onResult = callback; },
    set onError(callback) { onError = callback; },
    set onConnection(callback) { onConnection = callback; },
    set onWelcome(callback) { onWelcome = callback; },
  };
})();
