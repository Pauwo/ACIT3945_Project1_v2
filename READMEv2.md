# ACIT3945 Project 1

## Overview  
This project is a containerized Video Streaming System that allows users to register, log in, upload, and stream videos securely. It consists of multiple microservices, including web app, authentication, file storage, and MySQL.

## Features
**Video Uploading** – Users can upload videos and store them in a dedicated storage container.
**Video Streaming** – Videos can be streamed securely using token-based authentication.
**User Authentication** – Secure login using JWT tokens.
**MySQL Database** – Stores user information and video metadata.
**Containerized Deployment** – The system runs in isolated Docker containers for easy setup and scalability.  

## Microservices  

### Web App Upload Service
- Handles user registration and login.
- Provides the user interface for uploading videos.  
- Uses JWT authentication to secure endpoints.  
- Interacts with MySQL for storing user and video metadata.  

### Web App Streaming Service
- Manages video streaming to users
- Uses JWT authentication to secure endpoints
- Retrieves video metadata from MySQL

### Authentication Service
- Users register and log in using hashed passwords (bcrypt).  
- Generates JWT tokens for authentication.  
- Ensures secure access control to videos.  

### File System Service
- Manages video storage using a Docker volume.  
- Ensures that users can only access their own videos.  
- Handles secure video streaming requests.  

### MySQL Database Service
- Stores user credentials and video metadata (filename, path, original name).  
- Automatically initialized with init.sql.  
- Provides structured storage for authentication and video records.  


## Setup & Installation  

### Prerequisites
- Docker
- Docker Compose 

### Run the Project Locally

1. Clone the repository:  
```sh
git clone https://github.com/Katy0903/ACIT3495_project1.git
cd ACIT3495_project1
```

2. Start the services using Docker Compose:  
```sh
docker-compose up -d
```
This command will:
- Build the Docker images for the `web-app` service.
- Start the `mysql` and `storage` services.
- Create the necessary networks and volumes.

3. Access the web app in your browser:  
```
http://localhost:8080
```

## 📡 API Endpoints  

| **Endpoint**        | **Method** | **Description** |
|---------------------|-----------|----------------|
| `/register`        | POST      | Register a new user |
| `/login`           | POST      | Log in and get a JWT token |
| `/user-info`       | GET       | Get user information (requires token) |
| `/upload`          | POST      | Upload a video (requires token) |
| `/videos`          | GET       | Get the list of uploaded videos (requires token) |
| `/video/:username/:filename` | GET | Stream a video (requires token) |

## Workflow

1. User Registration:
- A user sends a `POST` request to the `/register` endpoint with a username and password.
- The server hashes the password using bcrypt.
- The server stores the username and hashed password in the users table in the MySQL database.
- The server sends a success response.

2. User Login:
- A user sends a `POST` request to the `/login` endpoint with their username and password.
- The server queries the users table to find the user.
- The server compares the provided password with the stored hashed password using bcrypt.
- If the passwords match, the server generates a JWT token using the jsonwebtoken library.
- The server sends the JWT token back to the user in the response.

3. Video Upload:
- The user sends a `POST` request to the `/upload` endpoint, including the JWT token in the Authorization header (as a Bearer token) and the video file in the video field.
- The verifyToken middleware validates the JWT token. If the token is invalid, the request is rejected.
- If the token is valid, the multer middleware saves the video file to a directory within the `/storage` volume, organized by the user's username. A timestamped unique filename is generated to avoid overwriting.
- The server stores the video's metadata (username, file path, original filename) in the videos table in the MySQL database.
- The server sends a success response.

4. Video Listing:
- The user sends a `GET` request to the `/videos` endpoint, including the JWT token in the Authorization header.
- The verifyToken middleware validates the JWT token.
- The server queries the videos table to retrieve a list of videos associated with the user's username.
- The server sends the list of video metadata back to the user.

5. Video Streaming:
- The user sends a `GET` request to the `/video/:username/:filename` endpoint, including the JWT token as a query parameter named token.
- The server validates the token and checks if the username in the token matches the username in the URL. This is basic authorization.
- The server constructs the full video file path using the username and filename from the URL.
- The server reads the video file from the `/storage` volume.
- The server streams the video file to the user's browser, setting the appropriate Content-Type and handling Range requests for seeking.

6. Database Initialization:
- When the MySQL container starts, it executes the `init.sql` script.
- The script creates the video_db database if it doesn't exist.
- The script creates the users table to store user credentials (username and hashed password).
- The script creates the videos table to store video metadata (username, file path, original filename).