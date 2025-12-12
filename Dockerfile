# 1. Use Python (Required for CrewAI)
FROM python:3.10

# 2. Set up user permissions (Required for HF Spaces)
WORKDIR /app
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# 3. Install Python dependencies
COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 4. Copy your app files
COPY --chown=user . .

# 5. Run the Python server
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]