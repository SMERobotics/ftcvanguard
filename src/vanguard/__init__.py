def dev() -> None:
    import uvicorn
    uvicorn.run("app.main:app", app_dir=".", reload=True)
