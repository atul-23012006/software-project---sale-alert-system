// // server.js

// const express = require('express');
// const { spawn } = require('child_process');
// const path = require('path');

// const app = express(); // ✅ This line defines `app`
// const PORT = 3000;

// // Middleware to parse JSON
// app.use(express.json());

// // Serve static files (like index.html in a 'public' folder)
// app.use(express.static('public'));

// // Route to run the Python script
// // app.post('/run-python', (req, res) => {
// //     const userInput = req.body.user_input;

// //     const pythonProcess = spawn('python', ['webscrape.py', userInput]);

// //     let output = '';

// //     pythonProcess.stdout.on('data', (data) => {
// //         output += data.toString();
// //     });

// //     pythonProcess.stderr.on('data', (data) => {
// //         console.error(`Python error: ${data}`);
// //     });

// //     pythonProcess.on('close', (code) => {
// //         res.send(output); // Send raw HTML back to frontend
// //     });
// // });
// app.post('/run-python', (req, res) => {
//   const { user_input, targetPrice, phoneNumber } = req.body;

//   // Modify spawn args to send all inputs to python; e.g., as separate args or JSON string
//   const args = [user_input, targetPrice, phoneNumber];


//   // You can expand this to targetPrice and phoneNumber if your Python script is ready to use them

//   const pythonProcess = spawn('python', ['webscrape.py', ...args]);

//   let output = '';

//   pythonProcess.stdout.on('data', (data) => {
//     output += data.toString();
//   });

//   pythonProcess.stderr.on('data', (data) => {
//     console.error(`Python error: ${data}`);
//   });

//   pythonProcess.on('close', (code) => {
//     res.send(output);
//   });
// });

// const fs = require('fs');
// const savedInputPath = path.join(__dirname, 'saved_input.txt');

// app.get('/history', (req, res) => {
//   fs.readFile(savedInputPath, 'utf8', (err, data) => {
//     if (err) {
//       res.status(404).send("No history found");
//       return;
//     }
//     res.send(data);
//   });
// });




// // Start the server
// app.listen(PORT, () => {
//     console.log(`✅ Server running on http://localhost:${PORT}`);
// });






















// server.js
// server.js (simplified working version)

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ---- Run Python script ----
// --- normalized /run-python route (accepts snake_case or camelCase) ---
app.post('/run-python', (req, res) => {
  // Support both snake_case and camelCase keys from different frontends
  const body = req.body || {};

  const user_input = body.user_input || body.userInput || body.user || '';
  const target_raw = body.target_price ?? body.targetPrice ?? body.target ?? 0;
  const phone_number = body.phone_number || body.phoneNumber || body.phone || '';

  if (!user_input) {
    return res.status(400).json({ success: false, message: 'user_input required' });
  }

  // coerce target to a number safely
  let target_value = 0;
  if (typeof target_raw === 'number') {
    target_value = target_raw;
  } else {
    // try parse strings (empty -> 0)
    target_value = Number(String(target_raw).trim()) || 0;
  }

  // Build args exactly how webscrape.py expects: [user_input, target_price, phone_number]
  const pythonBin = process.env.PYTHON_BIN || 'python';
  const pyPath = path.join(__dirname, 'webscrape.py');
  const args = [pyPath, String(user_input), String(target_value), String(phone_number || '')];

  const py = spawn(pythonBin, args, { env: process.env });

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (data) => { stdout += data.toString(); });
  py.stderr.on('data', (data) => { stderr += data.toString(); console.error('[py stderr]', data.toString()); });

  py.on('error', (err) => {
    console.error('Failed to start Python process:', err);
    return res.status(500).json({ success: false, message: 'Failed to start Python process', error: String(err) });
  });

  py.on('close', (code) => {
    if (stderr) console.error('Python stderr: ', stderr);
    // If python prints JSON, try parse it; otherwise forward raw output (old behavior)
    try {
      const json = JSON.parse(stdout);
      if (json && json.success === false) return res.status(500).json(json);
      return res.json(json);
    } catch (e) {
      // fallback: return raw stdout (legacy)
      return res.send(stdout || stderr || `Python exited with code ${code}`);
    }
  });
});

// serve history file at GET /history
app.get('/history', (req, res) => {
  const savedInputPath = path.join(__dirname, 'saved_input.txt');
  fs.readFile(savedInputPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading saved_input.txt:', err && err.message ? err.message : err);
      if (err.code === 'ENOENT') {
        return res.status(404).send('No history found');
      }
      return res.status(500).send('Server error reading history');
    }
    res.type('text/plain').send(data);
  });
});


app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
