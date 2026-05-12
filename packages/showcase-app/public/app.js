document.addEventListener('DOMContentLoaded', () => {

  const processBtn = document.getElementById('process-btn');
  const spinner = document.getElementById('loading-spinner');
  const outcomeContainer = document.getElementById('outcome-container');

  // Hide all dynamic outcomes
  function hideOutcomes() {
    spinner.classList.add('hidden');
    outcomeContainer.innerHTML = '';
  }

  processBtn.addEventListener('click', async () => {
    hideOutcomes();
    spinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/process', { method: 'POST' });
      spinner.classList.add('hidden');
      
      if (response.ok) {
        outcomeContainer.innerHTML = `
          <div id="success-message" class="outcome-box success">
            <h3>Success!</h3>
            <p>The operation completed successfully.</p>
            <button class="ok-btn">OK</button>
          </div>
        `;
      } else {
        outcomeContainer.innerHTML = `
          <div id="error-dialog" class="outcome-box error">
            <h3>Error!</h3>
            <p>The operation failed to complete.</p>
            <button class="close-btn">Close</button>
          </div>
        `;
      }
      
      // Re-bind modal dismiss buttons after adding to DOM
      document.querySelectorAll('.ok-btn, .close-btn').forEach(btn => {
        btn.addEventListener('click', hideOutcomes);
      });
    } catch (err) {
      spinner.classList.add('hidden');
      outcomeContainer.innerHTML = `
        <div id="error-dialog" class="outcome-box error">
          <h3>Error!</h3>
          <p>The operation failed to complete.</p>
          <button class="close-btn">Close</button>
        </div>
      `;
      document.querySelectorAll('.ok-btn, .close-btn').forEach(btn => {
        btn.addEventListener('click', hideOutcomes);
      });
    }
  });

  document.getElementById('process-strict-fail-btn').addEventListener('click', () => {
    hideOutcomes();
    // Inject BOTH outcomes simultaneously to trigger a LocatorRace strict violation
    outcomeContainer.innerHTML = `
      <div id="success-message" class="outcome-box success">
        <h3>Success!</h3>
        <p>This appeared at the same time as the error.</p>
        <button class="ok-btn">OK</button>
      </div>
      <div id="error-dialog" class="outcome-box error">
        <h3>Error!</h3>
        <p>This appeared at the same time as the success message.</p>
        <button class="close-btn">Close</button>
      </div>
    `;
    document.querySelectorAll('.ok-btn, .close-btn').forEach(btn => {
      btn.addEventListener('click', hideOutcomes);
    });
  });

  // Interceptors buttons
  document.getElementById('trigger-console-err').addEventListener('click', () => {
    console.error("Critical frontend failure! Attempted access of undefined variables.");
    document.getElementById('trigger-console-err').textContent = "Console Failed";
  });

  document.getElementById('trigger-network-included').addEventListener('click', async () => {
    try {
      await fetch('/api/fail-included', { method: 'POST' });
    } catch (e) {
      console.log('Fetch exception handled.');
    }
  });

  document.getElementById('trigger-network-excluded').addEventListener('click', async () => {
    try {
      await fetch('/api/fail-excluded', { method: 'POST' });
    } catch (e) {
      console.log('Fetch exception handled.');
    }
  });

  document.getElementById('trigger-page-err').addEventListener('click', () => {
    setTimeout(() => {
      throw new Error("Unhandled UI Exception explicitly generated for testing.");
    }, 0);
  });

});

document.addEventListener('DOMContentLoaded', () => {
  const apiSpinner = document.getElementById('api-loading-spinner');
  const apiOutcomeContainer = document.getElementById('api-outcome-container');
  
  function hideApiOutcomes() {
    if (apiSpinner) apiSpinner.classList.add('hidden');
    if (apiOutcomeContainer) apiOutcomeContainer.innerHTML = '';
  }

  document.getElementById('fetch-user-btn')?.addEventListener('click', async () => {
    hideApiOutcomes();
    apiSpinner.classList.remove('hidden');
    try {
      const response = await fetch('/api/user');
      const json = await response.json();
      apiSpinner.classList.add('hidden');
      apiOutcomeContainer.innerHTML = `
        <div id="user-message" class="outcome-box success">
          <h3>Welcome ${json.data.user.name}!</h3>
        </div>
      `;
    } catch(err) {
      apiSpinner.classList.add('hidden');
    }
  });

  document.getElementById('fetch-product-btn')?.addEventListener('click', async () => {
    hideApiOutcomes();
    apiSpinner.classList.remove('hidden');
    try {
      const response = await fetch('/api/product');
      // For showcase simplicity, assuming valid XML structure response
      const xml = await response.text();
      // Extract Widget X rudimentary parse
      const productName = xml.split('<Name>')[1].split('</Name>')[0];
      apiSpinner.classList.add('hidden');
      apiOutcomeContainer.innerHTML = `
        <div id="product-message" class="outcome-box success">
          <h3>Product loaded: ${productName}</h3>
        </div>
      `;
    } catch(err) {
      apiSpinner.classList.add('hidden');
    }
  });

  document.getElementById('fetch-status-btn')?.addEventListener('click', async () => {
    hideApiOutcomes();
    apiSpinner.classList.remove('hidden');
    try {
      const response = await fetch('/api/status');
      const text = await response.text();
      apiSpinner.classList.add('hidden');
      apiOutcomeContainer.innerHTML = `
        <div id="status-message" class="outcome-box success">
          <h3>Status Response: ${text}</h3>
        </div>
      `;
    } catch(err) {
      apiSpinner.classList.add('hidden');
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('item-list');
  if (!list) return;

  document.getElementById('add-item-btn').addEventListener('click', () => {
    const li = document.createElement('li');
    li.textContent = 'New Item';
    list.appendChild(li);
  });

  document.getElementById('modify-item-btn').addEventListener('click', () => {
    const lastItem = list.lastElementChild;
    if (lastItem) {
      lastItem.textContent = 'Modified Item';
    }
  });

  document.getElementById('delete-item-btn').addEventListener('click', () => {
    const lastItem = list.lastElementChild;
    if (lastItem) {
      list.removeChild(lastItem);
    }
  });
});
