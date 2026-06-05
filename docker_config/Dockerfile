# --- Stage 1: Build Frontend static assets ---
FROM node:18-alpine AS fe-builder
WORKDIR /app/FE
COPY FE/package*.json ./
RUN npm install
COPY FE/ ./
RUN npm run build

# --- Stage 2: Build Backend & assemble stack ---
FROM python:3.11-slim AS be-runner
WORKDIR /app

# Install system dependencies (build tools, cmake, git, curl, python-is-python3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    curl \
    ca-certificates \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install backend python dependencies
COPY BE/requirements.txt ./BE/
RUN pip install --no-cache-dir -r BE/requirements.txt

# Copy backend application source code
COPY BE/ ./BE/

# Copy bootstrap scripts
COPY scripts/bootstrap_whisper_cpp.sh ./scripts/
COPY scripts/conda_exec.sh ./scripts/

# Create runtime directories
RUN mkdir -p .runtime

# Execute bootstrap script to compile Whisper.cpp and fetch GGML models
RUN chmod +x scripts/bootstrap_whisper_cpp.sh && ./scripts/bootstrap_whisper_cpp.sh

# Copy static frontend files built in stage 1 to target path
COPY --from=fe-builder /app/FE/dist ./FE/dist

# Create folders for runtime media storage
RUN mkdir -p uploads private_uploads tmp/interview-stt

# Expose backend port
EXPOSE 9000

# Set environment paths and start uvicorn
ENV PYTHONPATH=/app/BE
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
