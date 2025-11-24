#!/usr/bin/env python3
"""
Database initialization script for Urban Access Map
Run this once to set up the database structure
"""
import sqlite3
import os

def init_database():
    # Create instance directory if it doesn't exist
    os.makedirs('instance', exist_ok=True)
    
    # Connect to database (creates it if it doesn't exist)
    conn = sqlite3.connect('instance/accessibility.db')
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            issue_type TEXT NOT NULL,
            description TEXT,
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully in instance/accessibility.db")

if __name__ == '__main__':
    init_database()
