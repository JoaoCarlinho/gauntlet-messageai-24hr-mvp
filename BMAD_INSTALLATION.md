# BMAD Core v6 Alpha Installation

## Installation Summary

Successfully installed **bmad-method v6.0.0-alpha.6** in the messageAI project.

### Installation Date
November 6, 2025

### Package Information
- **Package:** `bmad-method`
- **Version:** `6.0.0-alpha.6`
- **License:** MIT
- **Repository:** https://github.com/bmad-code-org/BMAD-METHOD

### What is BMAD?

**BMad-CORE** (**C**ollaboration **O**ptimized **R**eflection **E**ngine) is a universal human-AI collaboration platform that amplifies human potential through specialized AI agents. It powers the BMad Method for AI-driven agile development.

### Installed Modules

The following modules have been installed in `.claude/`:

#### 1. **BMAD Core** (`.claude/bmad/core/`)
- Core agents: `bmad-master`, `bmad-web-orchestrator`
- Core workflows: `brainstorming`, `party-mode`
- Core tasks and tools
- Configuration system

#### 2. **BMM - BMad Method** (`.claude/bmad/bmm/`)
Revolutionary AI-driven agile framework with specialized agents:
- **Analyst** - Requirements analysis and user stories
- **Architect** - System design and technical architecture
- **Developer** - Implementation and code generation
- **PM (Product Manager)** - Product planning and roadmaps
- **SM (Scrum Master)** - Agile process management
- **TEA (Test Engineer)** - Testing and quality assurance
- **Tech Writer** - Documentation and technical writing
- **UX Designer** - User experience and interface design

#### 3. **BMB - BMad Builder** (`.claude/bmad/bmb/`)
Tools for creating custom agents, workflows, and modules

#### 4. **BMD - BMad Utilities** (`.claude/bmd/`)
Additional utilities and helper functions

#### 5. **Configuration** (`.claude/bmad/_cfg/`)
- Agent manifests and configurations
- Workflow manifests
- Task and tool definitions
- IDE-specific configurations

### Key Features

- **🎯 Scale-Adaptive Intelligence** - Automatically adjusts planning depth (Quick Flow, BMad Method, Enterprise Method)
- **🎨 Agent Customization** - Modify agent names, roles, personalities
- **🌐 Multi-Language Support** - Independent language settings
- **👤 Personalization** - Agents adapt to your preferences
- **🔄 Persistent Config** - Customizations survive updates
- **⚙️ Flexible Settings** - Per-module or global configuration

### Four-Phase Methodology

1. **Phase 1: Analysis** (Optional) - Brainstorming, research, product briefs
2. **Phase 2: Planning** - PRDs, architecture, UX design
3. **Phase 3: Implementation** - Development with continuous testing
4. **Phase 4: Quality** - Testing, documentation, deployment

### Directory Structure

```
.claude/
├── bmad/                      # Main BMAD modules
│   ├── _cfg/                  # Configuration and manifests
│   │   ├── agents/            # Agent configurations
│   │   ├── ides/              # IDE-specific configs
│   │   └── *.csv/*.yaml       # Various manifests
│   ├── core/                  # Core BMAD functionality
│   │   ├── agents/            # Core agents
│   │   ├── workflows/         # Core workflows
│   │   ├── tasks/             # Core tasks
│   │   └── tools/             # Core tools
│   ├── bmm/                   # BMad Method module
│   │   ├── agents/            # Development agents (8 specialized roles)
│   │   ├── workflows/         # Development workflows
│   │   └── tasks/             # Development tasks
│   └── bmb/                   # BMad Builder module
│       └── workflows/         # Builder workflows
└── bmd/                       # BMad utilities
    └── templates/             # Document templates
```

### Available Agents

#### Core Agents
- **bmad-master** - Master orchestrator for complex workflows
- **bmad-web-orchestrator** - Web development orchestration

#### BMM Development Agents
1. **Analyst** - Business analysis and requirements gathering
2. **Architect** - Technical architecture and system design
3. **Developer** - Code implementation and development
4. **PM** - Product management and planning
5. **SM** - Scrum Master for agile processes
6. **TEA** - Test Engineer for QA and testing
7. **Tech Writer** - Technical documentation
8. **UX Designer** - User experience design

### How to Use

#### Loading an Agent
To use any agent, simply reference them in Claude Code. For example:
- Load the Architect: Reference `.claude/bmad/bmm/agents/architect.md`
- Load the Developer: Reference `.claude/bmad/bmm/agents/dev.md`
- Load the PM: Reference `.claude/bmad/bmm/agents/pm.md`

#### Running Workflows
Workflows can be initiated using the `*workflow-init` command when an agent is loaded, or by referencing specific workflow files.

#### Agent Commands
Each agent supports various commands prefixed with `*`, such as:
- `*workflow-init` - Initialize a workflow
- `*analyze` - Analyze requirements
- `*design` - Create design documents
- `*implement` - Implement features
- `*test` - Run tests
- `*document` - Generate documentation

### Documentation

- **Main README:** `/node_modules/bmad-method/README.md`
- **Agent Documentation:** `.claude/bmad/bmm/agents/*.md`
- **Workflow Documentation:** `.claude/bmad/*/workflows/*/README.md`
- **Configuration Guide:** `.claude/bmad/_cfg/`
- **Online Docs:** https://github.com/bmad-code-org/BMAD-METHOD
- **v4 to v6 Upgrade Guide:** https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/v4-to-v6-upgrade.md

### Community & Support

- **Discord:** https://discord.gg/gk8jAdXWmj
- **YouTube:** https://www.youtube.com/@BMadCode
- **GitHub:** https://github.com/bmad-code-org/BMAD-METHOD
- **NPM:** https://www.npmjs.com/package/bmad-method

### Version Information

**Current Version:** v6.0.0-alpha.6 (Alpha)

> **Note:** v6-alpha is near-beta quality—stable and vastly improved over v4, but documentation is still being refined.

### Next Steps

1. **Explore Agents:** Review the agent files in `.claude/bmad/bmm/agents/`
2. **Try Workflows:** Start with a simple workflow like brainstorming
3. **Customize:** Modify agent configurations in `.claude/bmad/_cfg/agents/`
4. **Create PRDs:** Use the PM agent to create product requirements
5. **Design Architecture:** Use the Architect agent for system design
6. **Implement Features:** Use the Developer agent for coding

### Updates

To update BMAD in the future:
```bash
npm install bmad-method@alpha --save
# Then copy updated files to .claude/
cp -r node_modules/bmad-method/bmad/* .claude/bmad/
cp -r node_modules/bmad-method/bmd .claude/
```

### License

MIT License - See node_modules/bmad-method/LICENSE for details

---

**Installation completed successfully!** 🎉

All BMAD core modules are now available in the `.claude/` directory and ready to use.
