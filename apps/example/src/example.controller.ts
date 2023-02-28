import { Controller, Get } from "@nestjs/common";
import { ExampleService } from "./example.service";

@Controller()
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  getHello(): string {
    return this.exampleService.getHello();
  }
}
