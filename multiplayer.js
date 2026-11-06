const Multiplayer = (() => {
  let socket = null;
  let connected = false;
  let onState = () => {};
  let onResult = () => {};
  let onError = () => {};
  let onConnection = () => {};

  function backendUrl() {
    const configured = window.PET_GAME_BACKEND_URL;
    if (configured) return configured.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8000`;
  }

  function connect(user = {}) {
    socket = new WebSocket(`${backendUrl()}/ws/activity`);
    socket.addEventListener('open', () => {
      connected = true;
      onConnection(true);
      socket.send(JSON.stringify({ type: 'hello', user }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state') onState(message.state);
      if (message.type === 'state' && message.result) onResult(message.result);
      if (message.type === 'error') onError(message.code);
    });
    socket.addEventListener('close', () => {
      connected = false;
      onConnection(false);
    });
    socket.addEventListener('error', () => onError('connection_failed'));
  }

  function send(action, payload = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: 'action', action, payload }));
    return true;
  }

  return {
    connect,
    send,
    get connected() { return connected; },
    set onState(callback) { onState = callback; },
    set onResult(callback) { onResult = callback; },
    set onError(callback) { onError = callback; },
    set onConnection(callback) { onConnection = callback; },
  };
})();
