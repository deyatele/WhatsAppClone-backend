
async function getTurnConfig(userId) {
    const res = await fetch(`${baseUrl}/turn-credentials/${userId}`);
    const json = await res.json();
    return await json;
  }

function log(msg, error = false) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML +=
      `${msg} ${error ? `<pre>${JSON.stringify(error, null, 2).replaceAll(/\n/g, '<br>').replaceAll(/\s/g, '&nbsp;')}</pre>` : ``}` +
      '<br>';
    logDiv.scrollTop = logDiv.scrollHeight;
    if (error) console.log(error);
  }