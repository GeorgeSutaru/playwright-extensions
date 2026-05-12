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
  const spinner = document.getElementById('loading-spinner');
  const outcomeContainer = document.getElementById('outcome-container');
  function hideOutcomes() {
    spinner.classList.add('hidden');
    outcomeContainer.innerHTML = '';
  }

  document.getElementById('fetch-user-btn')?.addEventListener('click', async () => {
    hideOutcomes();
    spinner.classList.remove('hidden');
    try {
      const response = await fetch('/api/user');
      const json = await response.json();
      spinner.classList.add('hidden');
      outcomeContainer.innerHTML = `
        <div id="user-message" class="outcome-box success">
          <h3>Welcome ${json.data.user.name}!</h3>
        </div>
      `;
    } catch(err) {
      spinner.classList.add('hidden');
    }
  });
});
