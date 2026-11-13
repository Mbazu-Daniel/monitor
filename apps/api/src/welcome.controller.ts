import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator.ts";

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MivaCampus API</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #0f1b2d; color: #e7ecf3; }
  main { text-align: center; padding: 2rem; }
  .logo { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
  .tag { color: #f4b860; font-weight: 600; margin: 0.25rem 0 1.5rem; }
  p { color: #9fb0c9; max-width: 34rem; }
  ul { list-style: none; padding: 0; display: flex; gap: 1rem; justify-content: center; }
  a { color: #8ecbff; text-decoration: none; border: 1px solid #2b3d58; border-radius: 0.5rem; padding: 0.5rem 1rem; }
  a:hover { border-color: #8ecbff; }
</style>
</head>
<body>
<main>
  <div class="logo">MivaCampus</div>
  <div class="tag">Faults in, fixes out</div>
  <p>This is the MivaCampus API. If you are looking for the app, <a href="https://miva.oktopals.com">open MivaCampus</a>.</p>
  <ul>
    <li><a href="/api/v1/health">Health check</a></li>
    <li><a href="/api/v1/docs">API docs</a></li>
  </ul>
</main>
</body>
</html>
`;

@Public()
@Controller()
export class WelcomeController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  render(): string {
    return page;
  }
}
