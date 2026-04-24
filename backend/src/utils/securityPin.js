const PIN_LIFETIME_MS = 60 * 1000;

let currentPin = "";
let expiresAt = 0;

const generatePin = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");

const ensureCurrentPin = () => {
  const now = Date.now();

  if (!currentPin || now >= expiresAt) {
    currentPin = generatePin();
    expiresAt = now + PIN_LIFETIME_MS;
    console.log(`[SecurityPIN] New PIN generated: ${currentPin}, expires at: ${new Date(expiresAt).toLocaleTimeString()}`);
  }

  return { pin: currentPin, expiresAt };
};

/**
 * Returns metadata about the current PIN, including its expiration and remaining time.
 */
const getPinMeta = () => {
  const { pin, expiresAt: activeExpiresAt } = ensureCurrentPin();

  return {
    pin,
    expiresAt: new Date(activeExpiresAt).toISOString(),
    remainingSeconds: Math.max(0, Math.ceil((activeExpiresAt - Date.now()) / 1000))
  };
};

/**
 * Validates a given PIN against the current active PIN.
 */
const validatePin = (inputPin) => {
  const { pin } = ensureCurrentPin();
  return inputPin === pin;
};

module.exports = {
  getPinMeta,
  validatePin
};
