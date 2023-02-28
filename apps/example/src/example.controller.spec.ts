import { Test, TestingModule } from "@nestjs/testing";
import { ExampleController } from "./example.controller";
import { ExampleService } from "./example.service";

describe("ExampleController", () => {
  let exampleController: ExampleController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ExampleController],
      providers: [ExampleService],
    }).compile();

    exampleController = app.get<ExampleController>(ExampleController);
  });

  describe("root", () => {
    it('should return "Hello World!"', () => {
      expect(exampleController.getHello()).toBe("Hello World!");
    });
  });
});
