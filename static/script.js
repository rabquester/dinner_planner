document.addEventListener('DOMContentLoaded', function() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Modal functionality
    const modal = document.getElementById('dinner-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Load all dinners
    loadAllDinners();
    
    // Generate weekly plan
    document.getElementById('generate-plan').addEventListener('click', generateWeeklyPlan);
    
    // Form submission
    const dinnerForm = document.getElementById('dinner-form');
    dinnerForm.addEventListener('submit', handleFormSubmit);
    
    // Cancel edit button
    document.getElementById('cancel-edit').addEventListener('click', resetForm);
    
    // Edit and delete buttons in modal
    document.getElementById('edit-dinner').addEventListener('click', editDinnerFromModal);
    document.getElementById('delete-dinner').addEventListener('click', deleteDinnerFromModal);
    
    // Initial weekly plan generation
    generateWeeklyPlan();
});

// Load all dinners
async function loadAllDinners() {
    try {
        const response = await fetch('/api/dinners');
        const dinners = await response.json();
        
        const dinnersList = document.getElementById('dinners-list');
        dinnersList.innerHTML = '';
        
        dinners.forEach(dinner => {
            const dinnerCard = createDinnerCard(dinner);
            dinnersList.appendChild(dinnerCard);
        });
    } catch (error) {
        console.error('Error loading dinners:', error);
    }
}

// Generate weekly plan
async function generateWeeklyPlan() {
    try {
        const response = await fetch('/api/random_dinners');
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Failed to generate weekly plan');
            return;
        }
        
        const dinners = await response.json();
        const weeklyPlan = document.getElementById('weekly-plan');
        weeklyPlan.innerHTML = '';
        
        dinners.forEach(dinner => {
            const dinnerCard = document.createElement('div');
            dinnerCard.className = 'dinner-card';
            dinnerCard.innerHTML = `
                <h3>${dinner.name}</h3>
                <button class="view-btn" data-id="${dinner.id}">View Details</button>
                <button class="reroll-btn" data-id="${dinner.id}">Reroll</button>
            `;
            
            // View dinner details
            dinnerCard.querySelector('.view-btn').addEventListener('click', () => {
                showDinnerDetails(dinner.id);
            });
            
            // Reroll individual dinner
            dinnerCard.querySelector('.reroll-btn').addEventListener('click', async () => {
                await rerollDinner(dinnerCard, dinner.id);
            });
            
            weeklyPlan.appendChild(dinnerCard);
        });
    } catch (error) {
        console.error('Error generating weekly plan:', error);
    }
}

// Reroll individual dinner
async function rerollDinner(dinnerCard, currentId) {
    try {
        const response = await fetch('/api/dinners');
        const allDinners = await response.json();
        
        // Filter out the current dinner
        const availableDinners = allDinners.filter(dinner => dinner.id !== currentId);
        
        if (availableDinners.length === 0) {
            alert('No other dinners available to reroll!');
            return;
        }
        
        // Pick a random dinner from the available ones
        const randomIndex = Math.floor(Math.random() * availableDinners.length);
        const newDinner = availableDinners[randomIndex];
        
        // Update the dinner card
        dinnerCard.querySelector('h3').textContent = newDinner.name;
        dinnerCard.querySelector('.view-btn').setAttribute('data-id', newDinner.id);
        dinnerCard.querySelector('.reroll-btn').setAttribute('data-id', newDinner.id);
        
        // Update event listeners
        dinnerCard.querySelector('.view-btn').addEventListener('click', () => {
            showDinnerDetails(newDinner.id);
        });
        
        dinnerCard.querySelector('.reroll-btn').addEventListener('click', () => {
            rerollDinner(dinnerCard, newDinner.id);
        });
    } catch (error) {
        console.error('Error rerolling dinner:', error);
    }
}

// Create dinner card
function createDinnerCard(dinner) {
    const dinnerCard = document.createElement('div');
    dinnerCard.className = 'dinner-card';
    dinnerCard.innerHTML = `
        <h3>${dinner.name}</h3>
        <button class="view-btn" data-id="${dinner.id}">View Details</button>
    `;
    
    dinnerCard.querySelector('.view-btn').addEventListener('click', () => {
        showDinnerDetails(dinner.id);
    });
    
    return dinnerCard;
}

// Show dinner details in modal
async function showDinnerDetails(dinnerId) {
    try {
        const response = await fetch(`/api/dinner/${dinnerId}`);
        const dinner = await response.json();
        
        document.getElementById('modal-dinner-name').textContent = dinner.name;
        
        const ingredientsList = document.getElementById('modal-ingredients');
        ingredientsList.innerHTML = '';
        dinner.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientsList.appendChild(li);
        });
        
        document.getElementById('modal-recipe').textContent = dinner.recipe;
        document.getElementById('modal-notes').textContent = dinner.notes || 'No notes';
        
        // Store dinner ID for edit/delete operations
        document.getElementById('edit-dinner').setAttribute('data-id', dinner.id);
        document.getElementById('delete-dinner').setAttribute('data-id', dinner.id);
        
        document.getElementById('dinner-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading dinner details:', error);
    }
}

// Handle form submission (add/edit dinner)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const dinnerId = document.getElementById('dinner-id').value;
    const name = document.getElementById('name').value;
    const ingredientsText = document.getElementById('ingredients').value;
    const recipe = document.getElementById('recipe').value;
    const notes = document.getElementById('notes').value;
    
    // Convert ingredients text to array
    const ingredients = ingredientsText.split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');
    
    const dinnerData = {
        name,
        ingredients,
        recipe,
        notes
    };
    
    try {
        let response;
        
        if (dinnerId) {
            // Update existing dinner
            response = await fetch(`/api/dinner/${dinnerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dinnerData)
            });
        } else {
            // Add new dinner
            response = await fetch('/api/dinner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dinnerData)
            });
        }
        
        if (response.ok) {
            resetForm();
            loadAllDinners();
            
            // Switch to All Dinners tab
            document.querySelector('[data-tab="all-dinners"]').click();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to save dinner');
        }
    } catch (error) {
        console.error('Error saving dinner:', error);
    }
}

// Edit dinner from modal
function editDinnerFromModal() {
    const dinnerId = document.getElementById('edit-dinner').getAttribute('data-id');
    
    // Close the modal
    document.getElementById('dinner-modal').style.display = 'none';
    
    // Switch to Add/Edit tab
    document.querySelector('[data-tab="add-dinner"]').click();
    
    // Load dinner data into form
    loadDinnerIntoForm(dinnerId);
}

// Load dinner data into form
async function loadDinnerIntoForm(dinnerId) {
    try {
        const response = await fetch(`/api/dinner/${dinnerId}`);
        const dinner = await response.json();
        
        document.getElementById('dinner-id').value = dinner.id;
        document.getElementById('name').value = dinner.name;
        document.getElementById('ingredients').value = dinner.ingredients.join('\n');
        document.getElementById('recipe').value = dinner.recipe;
        document.getElementById('notes').value = dinner.notes || '';
        
        // Update form title and show cancel button
        document.getElementById('form-title').textContent = 'Edit Dinner';
        document.getElementById('cancel-edit').style.display = 'inline-block';
    } catch (error) {
        console.error('Error loading dinner for editing:', error);
    }
}

// Delete dinner from modal
async function deleteDinnerFromModal() {
    if (!confirm('Are you sure you want to delete this dinner?')) {
        return;
    }
    
    const dinnerId = document.getElementById('delete-dinner').getAttribute('data-id');
    
    try {
        const response = await fetch(`/api/dinner/${dinnerId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Close the modal
            document.getElementById('dinner-modal').style.display = 'none';
            
            // Reload dinners
            loadAllDinners();
            generateWeeklyPlan();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to delete dinner');
        }
    } catch (error) {
        console.error('Error deleting dinner:', error);
    }
}

// Reset form
function resetForm() {
    document.getElementById('dinner-form').reset();
    document.getElementById('dinner-id').value = '';
    document.getElementById('form-title').textContent = 'Add New Dinner';
    document.getElementById('cancel-edit').style.display = 'none';
}