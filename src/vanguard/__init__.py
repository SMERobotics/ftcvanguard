def dev() -> None:
    import uvicorn
    uvicorn.run("app.main:app", app_dir=".", host="0.0.0.0", port=8000, reload=True)
