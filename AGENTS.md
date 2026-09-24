# ftcvanguard

## Practices

When writing code:
- Names are for quick identification, not cramming every detail into dozens of references.
    - Do not use long, verbose names: Choose clearer, more semantically specific names that can be shorter.
- Functions are for simplifying execution flow, not making code more difficult to follow.
    - Do not create single-use helper functions, especially not for organization: Only create helper functions when the execution flow mandates so.
- Comments describe how things are used, not to annotate every line of behavior.
    - Do not insert a comment simply because something was done: Use comments when something **unclear, unapparent, or unexpected** occurs.
- Work in a **lazy, but not careless** mindset. The simplest and least complex approach is the preferred one.
    - Example: Simplifying 500 lines of overly complex and structurally verbose code into 50 lines of clean, linear execution.
    - Anti-pattern: Failing to implement industry-standard SWE practices in favor of writing problematic production code.

### Development tooling

- Use `uv` for Python.
- Use `bun` instead of npm.
    - If calls to `bun` fail, wrap it in `proxychains4 bun`.