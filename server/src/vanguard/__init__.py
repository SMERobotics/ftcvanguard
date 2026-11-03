def start() -> None:
    import uvicorn
    uvicorn.run("vanguard.main:app", host="0.0.0.0", port=8000)

def dev() -> None:
    import uvicorn
    uvicorn.run("vanguard.main:app", host="0.0.0.0", port=8000, reload=True)
