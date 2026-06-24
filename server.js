require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { processGraph } = require('./graphHelper');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load college credentials from config.json if it exists, otherwise use env variables or defaults
let defaultIdentity = {
  user_id: "vansh_24062026",
  email_id: "vansh@college.edu",
  college_roll_number: "2210999999"
};

try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(rawConfig);
    if (parsed.user_id) defaultIdentity.user_id = parsed.user_id;
    if (parsed.email_id) defaultIdentity.email_id = parsed.email_id;
    if (parsed.college_roll_number) defaultIdentity.college_roll_number = parsed.college_roll_number;
  }
} catch (err) {
  console.warn("Failed to load config.json, using defaults or env variables", err.message);
}

// POST /bfhl endpoint
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Request body must contain a 'data' array of strings."
      });
    }

    // Call graph processing logic
    const graphResults = processGraph(data);

    // Read identity values from env vars if set (ideal for Vercel/Render hosting configurations), fallback to config values
    const response = {
      user_id: process.env.USER_ID || defaultIdentity.user_id,
      email_id: process.env.EMAIL_ID || defaultIdentity.email_id,
      college_roll_number: process.env.COLLEGE_ROLL_NUMBER || defaultIdentity.college_roll_number,
      ...graphResults
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error: " + error.message
    });
  }
});

// GET /bfhl to show helper message (makes testing easy)
app.get('/bfhl', (req, res) => {
  res.status(200).json({
    message: "POST to this route with a JSON body like: { \"data\": [\"A->B\", \"B->C\"] } to process hierarchies.",
    supported_methods: ["POST"]
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
