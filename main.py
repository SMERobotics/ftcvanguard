import argparse
from dotenv import load_dotenv
import os
import uvicorn


def factory():
    from app.server import app

    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Real-time everything solution for FTC teams. Schedule, scout, and scheme, all from your mobile/desktop device."
    )

    parser.add_argument(
        "--host",
        "-H",
        type=str,
        default="0.0.0.0",
        help="The host to bind the server to. (default: 0.0.0.0)",
    )

    parser.add_argument(
        "--port",
        "-P",
        type=int,
        default=8080,
        help="The port to bind the server to. (default: 8080)",
    )

    parser.add_argument(
        "--workers",
        "-w",
        type=int,
        default=1,
        help="The number of worker processes to use. (default: 1)",
    )

    parser.add_argument(
        "--development",
        "--dev",
        "-d",
        action="store_true",
        help="Run the server in development mode. (default: False)",
    )

    args = parser.parse_args()

    load_dotenv()
    if args.development:
        os.environ["FTCVANGUARD_DEVELOPMENT"] = "1"

    uvicorn.run(
        app="main:factory",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.development,
        factory=True,
    )
