import { All, Controller, Req, Res } from "@nestjs/common";
import { toNodeHandler } from "better-auth/node";
import type { NodeRequest as Request, NodeResponse as Response } from "@nestjs/platform-node";
import { auth } from "../common/config/better-auth.config.ts";
import { Public } from "../common/decorators/public.decorator.ts";

@Public()
@Controller("auth")
export class AuthController {
  private readonly handler = toNodeHandler(auth);

  @All("{*path}")
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handler(req, res);
  }
}
