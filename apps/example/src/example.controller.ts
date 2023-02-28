import { Controller, Post } from "@nestjs/common";
import { ExampleService } from "./example.service";

@Controller()
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  createJob(): Promise<void> {
    return this.exampleService.createJob();
  }
}
