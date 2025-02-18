CREATE DATABASE IF NOT EXISTS video_db;

-- Use the video_db database
USE video_db;

-- Create the users table (for storing username and password)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Create the videos table (for storing the file paths of uploaded videos)
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username)
);