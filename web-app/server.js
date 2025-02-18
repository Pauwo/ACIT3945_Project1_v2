const express = require('express');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 8080;

// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'rootpassword',
  database: process.env.MYSQL_DB || 'video_db',
});


// Check MySQL connection
db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  
    // Check if the admin user exists, and create it if not
    db.query('SELECT * FROM users WHERE username = "admin"', (err, results) => {
      if (err) {
        console.error('Error checking admin user:', err);
      } else if (results.length === 0) {
        bcrypt.hash('123', 10, (err, hashedPassword) => {
          if (err) return console.error('Error hashing admin password:', err);
          db.query('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword], (err) => {
            if (err) {
              console.error('Error inserting admin user:', err);
            } else {
              console.log('Admin user inserted');
            }
          });
        });
      }
    });
  });


// JWT Secret key
const JWT_SECRET = 'your-secret-key';

// Middleware
app.use(express.json()); // Parse incoming JSON requests
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, JS, CSS)

// File storage using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = path.join(__dirname, 'storage', req.user.username); // Dynamic user folder
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token is required');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user;
    next();
  });
};

// Registration endpoint (for simplicity, password should be hashed in production)
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);  // Log the error
        return res.status(500).send('Error hashing password');
      }
      db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
        if (err) {
          console.error("Error inserting user into DB:", err);  // Log the error
          return res.status(500).send('Error inserting user');
        }
        res.send('User registered');
      });
    });
  });
  

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).send('Error fetching user');
    if (results.length === 0) return res.status(404).send('User not found');
    const user = results[0];
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) return res.status(401).send('Invalid credentials');
      const token = jwt.sign({ username: user.username }, JWT_SECRET);
      res.json({ token });
    });
  });
});

// Video upload endpoint
app.post('/upload', verifyToken, upload.single('video'), (req, res) => {
  const filePath = `/storage/${req.user.username}/${req.file.filename}`;
  db.query('INSERT INTO videos (username, path) VALUES (?, ?)', [req.user.username, filePath], (err) => {
    if (err) return res.status(500).send('Error uploading video');
    res.send('Video uploaded successfully');
  });
});

// Get uploaded videos
app.get('/videos', verifyToken, (req, res) => {
  db.query('SELECT * FROM videos WHERE username = ?', [req.user.username], (err, results) => {
    if (err) return res.status(500).send('Error fetching videos');
    res.json(results);
  });
});

// Serve uploaded videos
app.get('/video/:filename', (req, res) => {
  const videoPath = path.join(__dirname, 'storage', req.params.filename);
  res.sendFile(videoPath);
});

// Start the app
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
