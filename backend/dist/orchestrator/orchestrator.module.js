"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorModule = void 0;
const common_1 = require("@nestjs/common");
const agents_module_1 = require("../agents/agents.module");
const output_module_1 = require("../output/output.module");
const orchestrator_service_1 = require("./orchestrator.service");
const orchestrator_controller_1 = require("./orchestrator.controller");
let OrchestratorModule = class OrchestratorModule {
};
exports.OrchestratorModule = OrchestratorModule;
exports.OrchestratorModule = OrchestratorModule = __decorate([
    (0, common_1.Module)({
        imports: [agents_module_1.AgentsModule, output_module_1.OutputModule],
        providers: [orchestrator_service_1.OrchestratorService],
        controllers: [orchestrator_controller_1.OrchestratorController],
        exports: [orchestrator_service_1.OrchestratorService],
    })
], OrchestratorModule);
//# sourceMappingURL=orchestrator.module.js.map