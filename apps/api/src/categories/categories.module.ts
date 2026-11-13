import { Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller.ts";
import { CategoriesService } from "./categories.service.ts";

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
