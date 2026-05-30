from argon2 import PasswordHasher
from cryptography.hazmat.primitives import serialization
from datetime import datetime, timedelta, timezone
import jwt
import os

RSA_PUBLIC_KEY: bytes
RSA_PRIVATE_KEY: bytes

try:
    ssh = os.path.expanduser("~/.ssh")
    with open(os.path.join(ssh, "id_rsa.pub"), "rb") as f:
        RSA_PUBLIC_KEY = f.read()
    with open(os.path.join(ssh, "id_rsa"), "rb") as f:
        RSA_PRIVATE_KEY = f.read()
except Exception as e:
    raise ValueError(
        "Missing required RSA key pair: ~/.ssh/id_rsa, ~/.ssh/id_rsa.pub"
    ) from e


def _load_private_key(key: bytes):
    for loader in (
        serialization.load_pem_private_key,
        serialization.load_ssh_private_key,
    ):
        try:
            return loader(key, password=None)
        except TypeError, ValueError:
            pass
    raise ValueError("Could not load private key: ~/.ssh/id_rsa")


def _load_public_key(key: bytes):
    for loader in (
        serialization.load_pem_public_key,
        serialization.load_ssh_public_key,
    ):
        try:
            return loader(key)
        except TypeError, ValueError:
            pass
    raise ValueError("Could not load public key: ~/.ssh/id_rsa.pub")


private_key = _load_private_key(RSA_PRIVATE_KEY)
public_key = _load_public_key(RSA_PUBLIC_KEY)

ph = PasswordHasher()


def sign_jwt(payload: dict) -> str:
    payload = {
        **payload,
        "exp": int(
            (datetime.now(timezone.utc) + timedelta(hours=24)).timestamp()
        ),
    }
    return jwt.encode(payload, private_key, algorithm="PS256")


def verify_jwt(token: str) -> dict:
    return jwt.decode(token, public_key, algorithms=["PS256"])
