// Where is the backend?
// - Normal case: the Python backend serves this page too, so '' (same origin) is correct.
//   This also works inside Discord (Discord proxies the same origin to your tunnel).
// - Old two-server setup (run_game.py on port 5173): talk to the backend on port 8000.
window.PET_GAME_BACKEND_URL = location.port === '5173' ? 'http://127.0.0.1:8000' : '';
