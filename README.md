# ftcvanguard
unified ftc management infra. provide streamlined, real-time data, enabling rapid strategic insights. enable instant situational awareness, precise decisions, and ultratactical asymmetry.

## features
idk ask chat

## setting up:

### get a FTC api key
right [here](https://ftc-events.firstinspires.org/services/API/register)

### git clone
use your brain

### get a ssh keypair
```bash
openssl genpkey -algorithm RSA -out ~/.ssh/id_rsa.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -in ~/.ssh/id_rsa.pem -pubout -out ~/.ssh/id_rsa.pub
```
you dont really have to touch it at all, not used for anything else

### install ntfy on mobile devices
so that you guys can receive push notifs<br>
install it from play store or app store<br>
configure the server to be the same one thats hosting the main vanguard instance<br>
put your team number in as the topic

### install ntfy
install the ntfy service and configure it or run it in a docker container on the same server, idk<br>
make sure that its listening on `localhost:6767`<br>
youre in robotics, im sure you can figure ts out

### create the .env file
```
FTC_API_USERNAME=TechnoDot
FTC_API_TOKEN=67676767-6767-6767-6767-676767676767
```

### install uv
uv is like the pip but better and you should absolutely already have it but if you dont:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### install packages
```bash
uv venv .venv
uv pip install -r pyproject.toml
```

### configure gunicorn as service
use your brain

### ngnix reverse proxy
use your brain