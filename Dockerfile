# 1. Base Python Image
FROM python:3.10-slim

# 2. Set working directory
WORKDIR /app

# 3. Set non-root user (useful for HF Spaces or production security)
RUN adduser --disabled-password --gecos "" user
USER user

# 4. Set environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# 5. Copy requirements file and install Python dependencies
COPY --chown=user requirements.txt requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the application code
COPY --chown=user . .

# 7. Expose the app port
EXPOSE 7860

# 8. Command to run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]