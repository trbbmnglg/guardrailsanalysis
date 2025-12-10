# Use the official Python 3.10 image
FROM python:3.10

# Set the working directory
WORKDIR /app

# Create a non-root user (Hugging Face requirement for security)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Install dependencies
COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the application files
COPY --chown=user . .

# Expose the correct port for Hugging Face
EXPOSE 7860

# Command to run the application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]