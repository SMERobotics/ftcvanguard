FROM python:3.13

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN useradd -m -s /bin/bash vanguard

RUN apt-get update && apt-get install -y openssl

RUN mkdir /home/vanguard/.ssh && \
    chown -R vanguard:vanguard /home/vanguard/.ssh && \
    chmod 700 /home/vanguard/.ssh \

RUN openssl genpkey -algorithm RSA -out ~/.ssh/id_rsa.pem -pkeyopt rsa_keygen_bits:4096
RUN openssl rsa -in ~/.ssh/id_rsa.pem -pubout -out ~/.ssh/id_rsa.pub

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R vanguard:vanguard /app

USER vanguard

EXPOSE 8000
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]