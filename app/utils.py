from fastapi import HTTPException, Response, status
from httpx import HTTPStatusError

def _raise(response: Response) -> None:
    try:
        response.raise_for_status()
    except HTTPStatusError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        ) from None