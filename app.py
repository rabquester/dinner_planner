from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
import random
import json
import os

app = Flask(__name__)

# Create data directory if it doesn't exist
os.makedirs('/app/data', exist_ok=True)

# Use the database path from environment variable or default to the data directory
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///data/dinners.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Dinner(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ingredients = db.Column(db.Text, nullable=False)  # Stored as JSON string
    recipe = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'ingredients': json.loads(self.ingredients),
            'recipe': self.recipe,
            'notes': self.notes
        }

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/dinners')
def get_dinners():
    dinners = Dinner.query.all()
    return jsonify([dinner.to_dict() for dinner in dinners])

@app.route('/api/random_dinners')
def get_random_dinners():
    all_dinners = Dinner.query.all()
    if len(all_dinners) < 5:
        return jsonify({'error': 'Not enough dinners in the database. Please add more.'}), 400
    
    random_dinners = random.sample(all_dinners, 5)
    return jsonify([dinner.to_dict() for dinner in random_dinners])

@app.route('/api/dinner/<int:dinner_id>')
def get_dinner(dinner_id):
    dinner = Dinner.query.get_or_404(dinner_id)
    return jsonify(dinner.to_dict())

@app.route('/api/dinner', methods=['POST'])
def add_dinner():
    data = request.json
    
    # Convert ingredients list to JSON string
    ingredients_json = json.dumps(data['ingredients'])
    
    new_dinner = Dinner(
        name=data['name'],
        ingredients=ingredients_json,
        recipe=data['recipe'],
        notes=data.get('notes', '')
    )
    
    db.session.add(new_dinner)
    db.session.commit()
    
    return jsonify(new_dinner.to_dict()), 201

@app.route('/api/dinner/<int:dinner_id>', methods=['PUT'])
def update_dinner(dinner_id):
    dinner = Dinner.query.get_or_404(dinner_id)
    data = request.json
    
    dinner.name = data['name']
    dinner.ingredients = json.dumps(data['ingredients'])
    dinner.recipe = data['recipe']
    dinner.notes = data.get('notes', '')
    
    db.session.commit()
    
    return jsonify(dinner.to_dict())

@app.route('/api/dinner/<int:dinner_id>', methods=['DELETE'])
def delete_dinner(dinner_id):
    dinner = Dinner.query.get_or_404(dinner_id)
    db.session.delete(dinner)
    db.session.commit()
    
    return jsonify({'message': 'Dinner deleted successfully'})

# Replace the last lines with this
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)