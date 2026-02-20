from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Allowed emails
ADMIN_EMAILS = [
    'valarmathi3573@gmail.com',
    'suresh28062008@gmail.com',
    'valar3573@gmail.com',
    'arun123@gmail.com',
    'priyaravi@gmail.com'
]

STUDENT_EMAILS = [
    'valarmathi3573@gmail.com',
    'arun.kumar123@gmail.com',
    'priya.ravi98@yahoo.com',
    'vignesh_tech@outlook.com',
    'divya.sundar2004@gmail.com',
    'karthik.dev01@mail.com',
    'anitha.vijay@icloud.com',
    'siva.kumar2025@gmail.com',
    'meena_arts@outlook.com',
    'prakash.itpro@gmail.com',
    'ramya.designs@yahoo.com',
    'hari.krishna.dev@gmail.com',
    'deepa.finance@outlook.com',
    'surya.movies@gmail.com',
    'nisha.coder01@mail.com',
    'gokul.gaming@icloud.com'
]

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data['email'].strip().lower()
    
    if email in [e.lower() for e in ADMIN_EMAILS]:
        return jsonify({'success': True, 'role': 'admin', 'email': email})
    
    if email in [e.lower() for e in STUDENT_EMAILS]:
        return jsonify({'success': True, 'role': 'student', 'email': email})
    
    return jsonify({'success': False, 'error': 'Access denied. Email not in allowed list.'}), 403

DATABASE_FILE = 'complaints.json'
FEEDBACK_FILE = 'feedback.json'

def load_complaints():
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            return json.load(f)
    return []

def save_complaints(complaints):
    with open(DATABASE_FILE, 'w') as f:
        json.dump(complaints, f, indent=2)

def load_feedback():
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r') as f:
            return json.load(f)
    return []

def save_feedback(feedback):
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(feedback, f, indent=2)

def check_duplicate(new_title, new_description, complaints):
    new_title_norm = new_title.lower().strip()
    new_desc_norm = new_description.lower().strip()
    new_words = set(new_desc_norm.split())

    for complaint in complaints:
        if complaint['title'].lower().strip() == new_title_norm:
            return True
        c_desc_norm = complaint['description'].lower().strip()
        c_words = set(c_desc_norm.split())
        if new_words and c_words:
            intersection = len(new_words & c_words)
            union = len(new_words | c_words)
            if union > 0 and (intersection / union) > 0.5:
                return True
    return False

@app.route('/api/complaints/limited', methods=['GET'])
def get_limited_complaints():
    complaints = load_complaints()
    limited_complaints = sorted(complaints, key=lambda x: x['submittedAt'], reverse=True)[:5]
    return jsonify(limited_complaints)

@app.route('/api/complaints/search', methods=['GET'])
def search_complaints():
    query = request.args.get('query', '').lower().strip()
    if not query:
        return jsonify([])
    complaints = load_complaints()
    matching_complaints = []
    for complaint in complaints:
        title = complaint.get('title', '').lower()
        description = complaint.get('description', '').lower()
        status = complaint.get('status', '').lower()
        if query in title or query in description or query in status:
            matching_complaints.append(complaint)
    matching_complaints.sort(key=lambda x: x['submittedAt'], reverse=True)
    return jsonify(matching_complaints)

@app.route('/api/complaints/date', methods=['GET'])
def get_complaints_by_date():
    date = request.args.get('date', '').strip()
    if not date:
        return jsonify([])
    complaints = load_complaints()
    filtered_complaints = [c for c in complaints if c.get('submittedAt', '').split('T')[0] == date]
    filtered_complaints.sort(key=lambda x: x['submittedAt'], reverse=True)
    return jsonify(filtered_complaints)

@app.route('/api/feedback/date', methods=['GET'])
def get_feedback_by_date():
    date = request.args.get('date', '').strip()
    if not date:
        return jsonify([])
    feedback_list = load_feedback()
    filtered_feedback = [f for f in feedback_list if f.get('submittedAt', '').split('T')[0] == date]
    filtered_feedback.sort(key=lambda x: x['submittedAt'], reverse=True)
    return jsonify(filtered_feedback)

@app.route('/api/complaints/search/date', methods=['GET'])
def search_complaints_by_date():
    date = request.args.get('date', '').strip()
    if not date:
        return jsonify([])
    complaints = load_complaints()
    selected_date_complaints = [c for c in complaints if c.get('submittedAt', '').split('T')[0] == date]
    other_complaints = [c for c in complaints if c.get('submittedAt', '').split('T')[0] != date]
    selected_date_complaints.sort(key=lambda x: x['submittedAt'], reverse=True)
    other_complaints.sort(key=lambda x: x['submittedAt'], reverse=True)
    ordered_complaints = selected_date_complaints + other_complaints
    return jsonify(ordered_complaints)

@app.route('/api/feedback/search/date', methods=['GET'])
def search_feedback_by_date():
    date = request.args.get('date', '').strip()
    if not date:
        return jsonify([])
    feedback_list = load_feedback()
    selected_date_feedback = [f for f in feedback_list if f.get('submittedAt', '').split('T')[0] == date]
    other_feedback = [f for f in feedback_list if f.get('submittedAt', '').split('T')[0] != date]
    selected_date_feedback.sort(key=lambda x: x['submittedAt'], reverse=True)
    other_feedback.sort(key=lambda x: x['submittedAt'], reverse=True)
    ordered_feedback = selected_date_feedback + other_feedback
    return jsonify(ordered_feedback)

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    complaints = load_complaints()
    sorted_complaints = sorted(complaints, key=lambda x: x['submittedAt'], reverse=True)
    return jsonify(sorted_complaints)

@app.route('/api/complaints', methods=['POST'])
def add_complaint():
    data = request.get_json()
    if not data or not all(key in data for key in ['title', 'description', 'priority']):
        return jsonify({'error': 'Missing required fields'}), 400
    complaints = load_complaints()
    
    # Get userEmail from data
    user_email = data.get('userEmail')
    
    # Check for duplicate based on userEmail and title
    is_duplicate = False
    for complaint in complaints:
        if complaint.get('userEmail') == user_email and complaint['title'].lower().strip() == data['title'].lower().strip():
            is_duplicate = True
            break
    
    complaint = {
        'id': int(datetime.now().timestamp() * 1000),
        'title': data['title'],
        'description': data['description'],
        'priority': data['priority'],
        'status': 'pending',
        'submittedAt': datetime.now().isoformat(),
        'anonymous': data.get('anonymous', False),
        'department': data.get('department', 'General'),
        'userEmail': user_email
    }
    complaints.append(complaint)
    save_complaints(complaints)
    return jsonify({'complaint': complaint, 'isDuplicate': is_duplicate}), 201

@app.route('/api/complaints/<int:complaint_id>/resolve', methods=['PUT'])
def resolve_complaint(complaint_id):
    complaints = load_complaints()
    for complaint in complaints:
        if complaint['id'] == complaint_id:
            complaint['status'] = 'resolved'
            complaint['resolvedAt'] = datetime.now().isoformat()
            save_complaints(complaints)
            return jsonify(complaint)
    return jsonify({'error': 'Complaint not found'}), 404

@app.route('/api/complaints/stats', methods=['GET'])
def get_complaint_stats():
    complaints = load_complaints()
    total = len(complaints)
    pending = len([c for c in complaints if c['status'] == 'pending'])
    resolved = len([c for c in complaints if c['status'] == 'resolved'])
    return jsonify({'total': total, 'pending': pending, 'resolved': resolved})

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    feedback_list = load_feedback()
    sorted_feedback = sorted(feedback_list, key=lambda x: x['submittedAt'], reverse=True)
    return jsonify(sorted_feedback)

@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    data = request.get_json()
    if not data or not all(key in data for key in ['category', 'rating']):
        return jsonify({'error': 'Missing required fields'}), 400
    feedback_list = load_feedback()
    
    # Get userEmail from data
    user_email = data.get('userEmail')
    
    feedback = {
        'id': int(datetime.now().timestamp() * 1000),
        'category': data['category'],
        'rating': data['rating'],
        'feedbackText': data.get('feedbackText', ''),
        'anonymous': data.get('anonymous', False),
        'submittedAt': datetime.now().isoformat(),
        'userEmail': user_email,
        'status': data.get('status', 'pending')
    }
    feedback_list.append(feedback)
    save_feedback(feedback_list)
    return jsonify(feedback), 201

@app.route('/api/feedback/stats', methods=['GET'])
def get_feedback_stats():
    feedback_list = load_feedback()
    total = len(feedback_list)
    return jsonify({'total': total})

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
