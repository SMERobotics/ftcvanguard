FROM python:3.13

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN useradd -m -s /bin/bash vanguard

RUN apt-get update \
    && apt-get install -y openssl git \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/vanguard/.ssh \
    && chown -R vanguard:vanguard /home/vanguard/.ssh \
    && chmod 700 /home/vanguard/.ssh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY . .
RUN mkdir -p /app/data \
    && chown -R vanguard:vanguard /app \
    && chmod 755 /app/data

# Don't switch user yet - entrypoint will handle it
EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
