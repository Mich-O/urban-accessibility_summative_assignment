from flask import Flask, render_template, jsonify, request
import requests
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
app.config['DATABASE'] = 'accessibility.db'

def get_db():
    db = sqlite3.connect(app.config['DATABASE'])
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                issue_type TEXT NOT NULL,
                description TEXT,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/amenities')
def get_amenities():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    radius = request.args.get('radius', 500, type=int)
    
    if not lat or not lon:
        return jsonify({'error': 'Missing coordinates'}), 400
    
    overpass_query = f"""
    [out:json][timeout:25];
    (
      node["amenity"](around:{radius},{lat},{lon});
      way["amenity"](around:{radius},{lat},{lon});
      relation["amenity"](around:{radius},{lat},{lon});
    );
    out center;
    """
    
    try:
        response = requests.post(
            'https://overpass-api.de/api/interpreter',
            data={'data': overpass_query}
        )
        data = response.json()
        return jsonify(data['elements'])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET', 'POST'])
def handle_reports():
    if request.method == 'POST':
        data = request.get_json()
        
        db = get_db()
        db.execute(
            'INSERT INTO reports (lat, lon, issue_type, description) VALUES (?, ?, ?, ?)',
            (data['lat'], data['lon'], data['issue_type'], data.get('description', ''))
        )
        db.commit()
        
        return jsonify({'status': 'success'})
    
    else:
        db = get_db()
        reports = db.execute('SELECT * FROM reports').fetchall()
        return jsonify([dict(report) for report in reports])

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)