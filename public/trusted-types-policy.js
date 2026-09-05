(function registerTrustedTypesPolicy() {
  if (!window.trustedTypes || !window.trustedTypes.createPolicy) return;

  try {
    window.trustedTypes.createPolicy("default", {
      createHTML: function (input) {
        return input;
      },
      createScriptURL: function (input) {
        return input;
      },
    });
  } catch (error) {
    // The policy can already exist during development hot reload.
  }
})();
