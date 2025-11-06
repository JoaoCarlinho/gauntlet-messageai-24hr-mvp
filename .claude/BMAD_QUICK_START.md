# BMAD Quick Start Guide

## 🚀 Getting Started with BMAD

BMAD (Breakthrough Method of Agile AI-driven Development) is now installed in your project!

## Available Agents

### Core Agents
Located in `.claude/bmad/core/agents/`

- **bmad-master** - Master orchestrator for complex workflows
- **bmad-web-orchestrator** - Web development orchestration

### BMM Development Agents
Located in `.claude/bmad/bmm/agents/`

1. **📋 PM (Product Manager)** - `pm.md`
   - Product planning and roadmaps
   - Feature prioritization
   - Requirements gathering
   - PRD creation

2. **📊 Analyst** - `analyst.md`
   - Business analysis
   - User story creation
   - Requirements refinement
   - Stakeholder communication

3. **🏗️ Architect** - `architect.md`
   - System design
   - Technical architecture
   - Technology decisions
   - Architecture documentation

4. **🎨 UX Designer** - `ux-designer.md`
   - User experience design
   - Interface design
   - User flows
   - Wireframes

5. **💻 Developer** - `dev.md`
   - Code implementation
   - Technical decisions
   - Code reviews
   - Refactoring

6. **🧪 TEA (Test Engineer)** - `tea.md`
   - Test planning
   - Test automation
   - Quality assurance
   - Bug tracking

7. **📚 Tech Writer** - `tech-writer.md`
   - Technical documentation
   - API documentation
   - User guides
   - README files

8. **🎯 SM (Scrum Master)** - `sm.md`
   - Sprint planning
   - Agile ceremonies
   - Team coordination
   - Process improvement

## How to Use an Agent

### Method 1: Direct Reference (Recommended for Claude Code)
Simply mention or reference the agent file in your conversation:

```
"Load the Product Manager agent from .claude/bmad/bmm/agents/pm.md"
```

### Method 2: Agent Commands
Once an agent is loaded, you can use commands:

- `*workflow-init` - Initialize a workflow
- `*status` - Show current status
- `*help` - Show available commands

### Method 3: Chat Naturally
After loading an agent, just describe what you want to do:

```
"I need to create a PRD for a new feature"
"Help me design the architecture for this system"
"Write tests for this component"
```

## Common Workflows

### 1. Starting a New Project

**Step 1:** Load the PM agent
```
"Load PM agent to help plan a new project"
```

**Step 2:** Create Product Brief
```
"Help me create a product brief for [your project idea]"
```

**Step 3:** Create PRD
```
"Create a comprehensive PRD"
```

**Step 4:** Load Architect for system design
```
"Load the Architect agent to design the system"
```

### 2. Implementing a Feature

**Step 1:** Load Analyst for requirements
```
"Load Analyst to help define user stories"
```

**Step 2:** Load Developer for implementation
```
"Load Developer agent to implement this feature"
```

**Step 3:** Load TEA for testing
```
"Load TEA agent to create tests"
```

### 3. Improving Documentation

**Step 1:** Load Tech Writer
```
"Load Tech Writer agent to improve documentation"
```

**Step 2:** Request specific documentation
```
"Create API documentation for this service"
"Write a comprehensive README"
```

## Planning Tracks

BMAD adapts to your project's scale:

### 🏃 Quick Flow Track
- **Best for:** Bug fixes, small features, clear scope
- **Deliverables:** Tech spec only
- **Time:** Hours to days

### 🚀 BMad Method Track
- **Best for:** Products, platforms, complex features
- **Deliverables:** PRD + Architecture + UX design
- **Time:** Days to weeks

### 🏢 Enterprise Method Track
- **Best for:** Enterprise requirements, compliance
- **Deliverables:** Full planning + Security + DevOps + Testing
- **Time:** Weeks to months

## Example Interactions

### Creating a New Feature

```
You: "Load PM agent to help plan a new authentication feature"

PM Agent: [Loads and greets]

You: "Create a PRD for OAuth2 authentication"

PM Agent: [Asks clarifying questions, then creates PRD]

You: "Load Architect to design the auth system"

Architect: [Reviews PRD, creates architecture doc]

You: "Load Developer to implement"

Developer: [Reviews architecture, implements code]
```

### Fixing a Bug

```
You: "Load Developer agent to help fix this authentication bug"

Developer: [Analyzes the issue]

You: "Here's the error: [paste error]"

Developer: [Identifies root cause, provides fix]

You: "Load TEA to create tests for this fix"

TEA: [Creates test cases to prevent regression]
```

### Documenting an API

```
You: "Load Tech Writer to document this API"

Tech Writer: [Reviews code]

You: "Create comprehensive API documentation"

Tech Writer: [Generates API docs with examples]
```

## Configuration

Configuration is stored in `.claude/bmad/bmm/config.yaml`:

```yaml
user_name: "Your Name"
communication_language: "English"
output_folder: "project-docs"
skill_level: "intermediate"
```

You can customize:
- Your name (agents will address you personally)
- Communication language
- Output folder for generated docs
- Skill level (beginner, intermediate, expert)

## Tips for Best Results

1. **Be Specific:** The more context you provide, the better the agent can help
2. **One Agent at a Time:** Focus on one agent's role per conversation phase
3. **Follow the Flow:** Analysis → Planning → Implementation → Testing
4. **Use Workflows:** Workflows guide you through best practices
5. **Customize Agents:** Edit agent files to match your team's style

## Workflow Files

Workflows are located in `.claude/bmad/*/workflows/`:

- **Brainstorming:** `.claude/bmad/core/workflows/brainstorming/`
- **Product Planning:** `.claude/bmad/bmm/workflows/product-planning/`
- **Architecture:** `.claude/bmad/bmm/workflows/architecture/`
- **And many more...**

## Getting Help

### In-Agent Help
```
"*help" - Show agent commands
"*status" - Show current context
"*menu" - Show available options
```

### Documentation
- Main README: See `BMAD_INSTALLATION.md`
- Agent docs: Each agent file contains its own documentation
- Workflow docs: Each workflow has a README

### Community
- Discord: https://discord.gg/gk8jAdXWmj
- YouTube: https://www.youtube.com/@BMadCode
- GitHub: https://github.com/bmad-code-org/BMAD-METHOD

## Quick Command Reference

| Command | Description |
|---------|-------------|
| `*workflow-init` | Start a workflow |
| `*help` | Show help menu |
| `*status` | Show agent status |
| `*menu` | Show command menu |
| `*exit` | Exit current agent |
| `*validate` | Validate deliverable |

## Next Steps

1. **Start Simple:** Try loading the PM agent and ask for help
2. **Explore Agents:** Load different agents to see their capabilities
3. **Try a Workflow:** Use `*workflow-init` to follow a guided process
4. **Customize:** Edit agent configurations to match your style
5. **Build Something:** Use the agents to actually build your project!

---

**Ready to start?** Try this:

```
"Load the PM agent to help me plan my messageAI project improvements"
```

Happy Building! 🚀
