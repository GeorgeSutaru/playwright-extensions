const cors = require('cors');
const express = require('express');
const path = require('path');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 8300;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Simulated slow operation endpoint
app.post('/api/process', (req, res) => {
  const isSuccess = Math.random() > 0.5;
  const delay = Math.floor(Math.random() * 2000) + 500;

  setTimeout(() => {
    if (isSuccess) {
      res.status(200).json({ success: true, message: 'Processing complete!' });
    } else {
      res.status(500).json({ success: false, message: 'Internal Server Error during processing' });
    }
  }, delay);
});

// Endpoint that IS caught by include wildcards
app.post('/api/fail-included', (req, res) => {
  res.status(500).json({ error: 'Endpoint intentionally failed (caught by wildcard include)' });
});

// Endpoint that matches include but is EXCLUDED by exclude rules
app.post('/api/fail-excluded', (req, res) => {
  res.status(500).json({ error: 'Endpoint failed but should be ignored by interceptor' });
});

app.listen(PORT, () => {
  console.log(`Showcase app listening on port ${PORT}`);
});

app.get('/api/user', (req, res) => {
  setTimeout(() => {
    res.status(200).json({ data: { user: { name: 'Alice' } } });
  }, 1000);
});

app.get('/api/product', (req, res) => {
  setTimeout(() => {
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Catalog><Product><Name>Widget X</Name><Price>19.99</Price></Product></Catalog>');
  }, 1000);
});

app.get('/api/status', (req, res) => {
  setTimeout(() => {
    res.set('Content-Type', 'text/plain');
    res.status(200).send('Server Status: ACTIVE system operational');
  }, 1000);
});

app.get('/api/missing-path', (req, res) => {
  setTimeout(() => {
    res.status(200).json({ data: { unrelated: true } });
  }, 500);
});

app.get('/api/error-code', (req, res) => {
  setTimeout(() => {
    res.status(500).json({ error: 'Internal Server Error', context: 'Database timeout' });
  }, 500);
});
