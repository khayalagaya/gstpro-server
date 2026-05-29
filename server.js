const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Authentication middleware (validates connection from your mobile app)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.CLOUD_KEY; // Token configured in sync settings
  
  if (expectedKey && (!authHeader || authHeader !== `Bearer ${expectedKey}`)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

app.use(express.json());

// Server health check route
app.get('/', (req, res) => {
  res.send('GSTPro Server Proxy is live and running!');
});

// GET /gstin/:gstin
app.get('/gstin/:gstin', authenticate, async (req, res) => {
  const { gstin } = req.params;
  const apiKey = process.env.APPYFLOW_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({ 
      success: false, 
      error: 'APPYFLOW_API_KEY environment variable is not configured on the Azure server.' 
    });
  }

  try {
    const response = await fetch(`https://api.appyflow.in/gsp/gstin/${gstin}?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: `GST Portal GSP responded with status code ${response.status}` 
      });
    }

    const data = await response.json();
    
    if (data.error === true) {
      return res.status(400).json({ 
        success: false, 
        error: data.message || 'GSTIN not found or invalid' 
      });
    }
    
    return res.json(data);
  } catch (err) {
    console.error('Error fetching details from GSP:', err);
    return res.status(500).json({ 
      success: false, 
      error: `Proxy request failed: ${err.message}` 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
