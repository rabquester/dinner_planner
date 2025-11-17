# Use Python 3.9 as the base image
FROM python:3.9-slim

# Set working directory in the container
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY app.py .
COPY static/ ./static/
COPY templates/ ./templates/

# Create a volume for the database to persist data
VOLUME /app/data

# Set environment variable to use the volume for the database
ENV SQLALCHEMY_DATABASE_URI=sqlite:///data/dinners.db

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]