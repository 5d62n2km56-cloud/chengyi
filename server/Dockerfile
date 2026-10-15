FROM python:3.12-slim
WORKDIR /service
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home heritage
COPY --chown=heritage:heritage . .
RUN mkdir -p data && chown heritage:heritage data
USER heritage
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
