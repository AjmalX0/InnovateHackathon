"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const llm_module_1 = require("../llm/llm.module");
const rag_module_1 = require("../rag/rag.module");
const supabase_module_1 = require("../supabase/supabase.module");
const input_agent_service_1 = require("./input-agent.service");
const content_agent_service_1 = require("./content-agent.service");
const pedagogy_agent_service_1 = require("./pedagogy-agent.service");
const notes_agent_service_1 = require("./notes-agent.service");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [llm_module_1.LlmModule, rag_module_1.RagModule, supabase_module_1.SupabaseModule],
        providers: [
            input_agent_service_1.InputAgentService,
            content_agent_service_1.ContentAgentService,
            pedagogy_agent_service_1.PedagogyAgentService,
            notes_agent_service_1.NotesAgentService,
        ],
        exports: [
            input_agent_service_1.InputAgentService,
            content_agent_service_1.ContentAgentService,
            pedagogy_agent_service_1.PedagogyAgentService,
            notes_agent_service_1.NotesAgentService,
        ],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map