export const sessionChannel = new BroadcastChannel("app_session");

export const broadcastLogout = (userId) => {
  sessionChannel.postMessage({ type: "FORCE_LOGOUT", userId });
};