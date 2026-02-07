FROM python:3.13

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Create a non-root user
RUN useradd -m -s /bin/bash vanguard

# Install dependencies
RUN apt-get update \
    && apt-get install -y openssl git \
    && rm -rf /var/lib/apt/lists/*

# Prepare SSH directory
RUN mkdir -p /home/vanguard/.ssh \
    && chown -R vanguard:vanguard /home/vanguard/.ssh \
    && chmod 700 /home/vanguard/.ssh

# Copy requirements & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set ownership for /app
RUN chown -R vanguard:vanguard /app

USER vanguard
EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
