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


// // Check MySQL connection
// db.connect((err) => {
//     if (err) {
//       console.error('Error connecting to MySQL:', err);
//       return;
//     }
//     console.log('Connected to MySQL');
  
//     // Check if the admin user exists, and create it if not
//     db.query('SELECT * FROM users WHERE username = "admin"', (err, results) => {
//       if (err) {
//         console.error('Error checking admin user:', err);
//       } else if (results.length === 0) {
//         bcrypt.hash('123', 10, (err, hashedPassword) => {
//           if (err) return console.error('Error hashing admin password:', err);
//           db.query('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword], (err) => {
//             if (err) {
//               console.error('Error inserting admin user:', err);
//             } else {
//               console.log('Admin user inserted');
//             }
//           });
//         });
//       }
//     });
//   });


// JWT Secret key
const JWT_SECRET = 'your-secret-key';

// Middleware
app.use(express.json()); // Parse incoming JSON requests
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, JS, CSS)

// File storage using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userFolder = path.join('/storage', req.user.username);
  
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
      }
      cb(null, userFolder);
    },
    filename: (req, file, cb) => {
      // Use the original filename, but add a timestamp to avoid overwriting
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.originalname.split('.')[0] + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });
  


const upload = multer({ storage });

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
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

// User info endpoint
app.get('/user-info', verifyToken, (req, res) => {
    res.json({ username: req.user.username });
  });

  
// Video upload endpoint
app.post('/upload', verifyToken, upload.single('video'), (req, res) => {
    const filePath = `/storage/${req.user.username}/${req.file.filename}`;
    db.query('INSERT INTO videos (username, path, original_name) VALUES (?, ?, ?)', 
      [req.user.username, filePath, req.file.originalname], 
      (err) => {
        if (err) return res.status(500).send('Error uploading video');
        res.send('Video uploaded successfully');
      }
    );
  });
  


// Get uploaded videos
app.get('/videos', verifyToken, (req, res) => {
    db.query('SELECT * FROM videos WHERE username = ?', [req.user.username], (err, results) => {
      if (err) return res.status(500).send('Error fetching videos');
      res.json(results);
    });
  });
  

app.get('/video/:username/:filename', (req, res) => {
    const token = req.query.token;

    if (!token) return res.status(403).send('Token is required');
  
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Invalid token');
        if (user.username !== req.params.username) {
            return res.status(403).send('Unauthorized access to this video');
        }

        const videoPath = path.join('/storage', req.params.username, req.params.filename);
        console.log('Attempting to serve video:', videoPath);

        fs.access(videoPath, fs.constants.R_OK, (err) => {
            if (err) {
                console.error('Error accessing video file:', err);
                return res.status(404).send('Video not found or not accessible');
            }

            const stat = fs.statSync(videoPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
                const chunksize = (end-start)+1;
                const file = fs.createReadStream(videoPath, {start, end});
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(206, head);
                file.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(200, head);
                fs.createReadStream(videoPath).pipe(res);
            }
        });
    });
});



// Start the app
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});