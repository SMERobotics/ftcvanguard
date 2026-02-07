FROM python:3.13

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN useradd -m -s /bin/bash vanguard

RUN apt-get update && apt-get install -y openssl

RUN mkdir /home/vanguard/.ssh
RUN chown -R vanguard:vanguard /home/vanguard/.ssh
RUN chmod 700 /home/vanguard/.ssh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN rm docker-entrypoint.sh

RUN chown -R vanguard:vanguard /app

USER vanguard

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
