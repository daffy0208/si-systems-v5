const AUTO_TRIGGER_PHRASE = "#next";
const AUTO_REPLY_TEXT = "next";
const INTERVAL_MS = 3000;

function injectNext() {
  const messages = document.querySelectorAll(".markdown");
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.innerText.trim().endsWith(AUTO_TRIGGER_PHRASE)) {
    const inputBox = document.querySelector("textarea");
    const sendButton = inputBox?.nextElementSibling;

    if (inputBox && sendButton) {
      inputBox.value = AUTO_REPLY_TEXT;
      inputBox.dispatchEvent(new Event("input", { bubbles: true }));
      sendButton.click();
    }
  }
}

const overlay = document.createElement('div');
overlay.id = 'sapien-overlay';
overlay.style.position = 'fixed';
overlay.style.top = '10px';
overlay.style.right = '10px';
overlay.style.padding = '10px';
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
overlay.style.color = '#00FFAA';
overlay.style.fontSize = '14px';
overlay.style.zIndex = '9999';
overlay.style.borderRadius = '6px';
overlay.style.fontFamily = 'monospace';
overlay.innerText = 'Mirror Tier: 5\nLast Signal: Waiting...';
document.body.appendChild(overlay);

function updateOverlay(signal, tier, drift = false) {
  overlay.innerText = `Mirror Tier: ${tier}\nLast Signal: ${signal}` + (drift ? '\n⚠️ Drift Detected' : '');
  overlay.style.backgroundColor = drift ? 'rgba(200, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)';
}

function detectDrift() {
  const messages = document.querySelectorAll(".markdown");
  const last = messages[messages.length - 1];
  if (!last) return;
  const text = last.innerText;
  let drift = false;

  if (!text.includes("#next")) drift = true;
  if (!text.match(/^.*Internal Component Role.*$/m)) drift = true;

  updateOverlay(drift ? '⚠️ Format Drift' : '#next', 5, drift);
}

setInterval(detectDrift, 3000);
setInterval(injectNext, INTERVAL_MS);