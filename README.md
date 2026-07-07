# ftcvanguard

Real-time everything solution for FTC teams. Schedule, scout, and scheme, all from your mobile/desktop device.

### synopsis of rewrite decision

> ftcvanguard was originally a little data visualizer project thrown together during health class. it was never meant to become a real codebase.
> 
> as visions and usecases expanded rapidly, the og codebase rapidly became unmaintanable. simulatenously, more and more feedback started coming in for features that just wouldn't be implementationally possible with the current state. to top it all off, none of the data handling and processing pipelines were optimized for speed, leading to severe degradations in ux.
> 
> consequently, I made the call to resolve all formerly addressed issues by starting all over again, with a clear finish line in mind.

\- technodot

## development

1. clone this repo! (checkout the `avantium` branch)
    ```
    git clone https://github.com/SMERobotics/ftcvanguard && cd ftcvanguard && git checkout avantium
    ```

2. install frontend deps, incl development ones
    ```
    bun install
    ```

3. setup venv using latest python
    ```
    uv venv .venv
    ```

4. activate your venv (depending on platform)
    - windows:
        ```
        .venv/Scripts/activate
        ```
    
    - macos/linux:
        ```
        source .venv/bin/activate
        ```

5. install all backend deps, incl development ones
    ```
    uv sync
    ```

6. if you're a dev on the team, ask `technodot` for a development copy of `.env`. otherwise, fill in the blanks as per below:
    ```
    DATABASE_URL=postgresql+asyncpg://username:password@point.at.your:5432/database # probably don't push

    FTC_API_USERNAME=DeanKamen # probably don't push
    FTC_API_TOKEN=67676767-6767-6767-6767-676767676767 # probably don't push
    ```

    1. you will need your own postgresql db.
        - your options:
            - ~~use the bundled docker one~~ TODO
            - figure out hosting one yourself (glhf)
            - create a database on some DBaaS like Supabase/Neon (higher latency & less control, but easier)
        
        - most likely, the url you are given will NOT include the `+asyncpg://` part. INSERT IT IN. I PROMISE IT'S IMPORTANT.
    
    2. register for FTC API access at https://ftc-events.firstinspires.org/services/API/register.
        - fill in your full name, email, and username.
        - read and decide if you want to accept any legal mumbo jumbo.
        - fill in your client username and token into `.env`.

7. generate a rsa keypair!
    ```
    ssh-keygen -t rsa -b 4096
    ```

    skip everything with enter, it should save files to `~/.ssh/`.

8. get it up and running!
    - if you're just working on backend only, you can just build the frontend once
        ```
        bun vite build
        ```
    
    - else, if you're working on both at the same time, in a new terminal, run
        ```
        bun vite build --watch
        ```
    
    - finally, run the server itself
        ```
        uv run main.py --dev
        ```

9. pull up http://0.0.0.0:8080 and enjoy!

## deployment

deployment? nice one twinnamon roll :sob:

on a serious note, Docker coming in August H2 roadmap. ask `technodot` if any questions