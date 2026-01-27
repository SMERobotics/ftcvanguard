FROM python:3.13

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN useradd -m -s /bin/bash vanguard

RUN apt-get update && apt-get install -y openssl

RUN mkdir /home/vanguard/.ssh
RUN chown -R vanguard:vanguard /home/vanguard/.ssh
RUN chmod 700 /home/vanguard/.ssh

RUN openssl genpkey -algorithm RSA -out /home/vanguard/.ssh/id_rsa.pem -pkeyopt rsa_keygen_bits:4096
RUN openssl rsa -in /home/vanguard/.ssh/id_rsa.pem -pubout -out /home/vanguard/.ssh/id_rsa.pub

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mv ./config/settings.toml.example ./config/settings.toml

RUN chown -R vanguard:vanguard /app

USER vanguard

EXPOSE 8000
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]