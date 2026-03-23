async function executeScan() {
  const email = document.getElementById('email-input')?.value;
  const hours = document.getElementById('hours-input')?.value;
  const button = document.getElementById('scan-btn');

  if (!email || !hours) return alert("System requires Email and Hours.");
  
  button.innerText = "PENETRATING SYSTEMS...";
  button.disabled = true;

  try {
    // Relative path is vital for GitHub Tunnels
    const response = await fetch('api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, hours })
    });

    const data = await response.json();
    if (data.success) {
      window.location.href = `result.html?leak=${data.leak}`;
    }
  } catch (err) {
    console.error("TUNNEL_BLOCK:", err);
    alert("GitHub Tunnel Resetting. Please try again in 5 seconds.");
    button.disabled = false;
    button.innerText = "RETRY SCAN";
  }
}
