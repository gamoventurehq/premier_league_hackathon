# Premier League Studio: Synthetic Match Insights Engine
#
# The image runs the FastAPI service with **zero** Azure credentials: every
# Azure client is created lazily and the whole simulation, the Pitch Control
# surface and the four-agent swarm run locally.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv

# Dependencies first, so the layer is cached across source changes.
COPY pyproject.toml README.md ./
COPY app ./app

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install ".[azure]"

ENV PATH="/opt/venv/bin:$PATH"

# The simulation is CPU bound and the WebSocket fans out to every studio
# client, so the container is given a little more room to breathe.
ENV SIMULATION_HZ=10 \
    PUBLISH_HZ=5 \
    SIM_WARMUP_SECONDS=480 \
    LOG_LEVEL=INFO

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
