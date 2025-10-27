// server.js

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express(); // ✅ This line defines `app`
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve static files (like index.html in a 'public' folder)
app.use(express.static('public'));

// Route to run the Python script
// app.post('/run-python', (req, res) => {
//     const userInput = req.body.user_input;

//     const pythonProcess = spawn('python', ['webscrape.py', userInput]);

//     let output = '';

//     pythonProcess.stdout.on('data', (data) => {
//         output += data.toString();
//     });

//     pythonProcess.stderr.on('data', (data) => {
//         console.error(`Python error: ${data}`);
//     });

//     pythonProcess.on('close', (code) => {
//         res.send(output); // Send raw HTML back to frontend
//     });
// });
app.post('/run-python', (req, res) => {
  const { user_input, targetPrice, phoneNumber } = req.body;

  // Modify spawn args to send all inputs to python; e.g., as separate args or JSON string
  const args = [user_input, targetPrice, phoneNumber];


  // You can expand this to targetPrice and phoneNumber if your Python script is ready to use them

  const pythonProcess = spawn('python', ['webscrape.py', ...args]);

  let output = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    res.send(output);
  });
});

const fs = require('fs');
const savedInputPath = path.join(__dirname, 'saved_input.txt');

app.get('/history', (req, res) => {
  fs.readFile(savedInputPath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).send("No history found");
      return;
    }
    res.send(data);
  });
});




// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
