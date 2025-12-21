FROM python:3.10-slim
WORKDIR /app
RUN adduser --disabled-password --gecos "" user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH

COPY --chown=user requirements.txt requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Optional verification
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; print('Embeddings OK')"

COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]