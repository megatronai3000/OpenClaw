# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

### Model Configuration

- Consider using `openrouter/pony-alpha` as a fallback model for cost-sensitive tasks and non-critical processes.

---

## Local Models (macOS - 64GB RAM Optimized)

Machine: 6-Core i5, 64GB RAM, Radeon Pro 580X
Strategy: Run 70% of workloads locally to save ~$5-7/day

### Available Models

| Model | Size | RAM | Use Case | Speed |
|-------|------|-----|----------|-------|
| **llama3.2:8b** | 4.9GB | ~10GB | Proposals, analysis, drafting | Fast |
| **qwen2.5-coder:7b** | 4.7GB | ~10GB | Coding, architecture decisions | Fast |
| **qwen2.5:14b** | 9.0GB | ~18GB | Complex reasoning, debugging | Medium |
| **llama3.1:8b** | 4.9GB | ~10GB | General tasks, summaries | Fast |

### Concurrency (6 Cores)
- Can run 4 models simultaneously (10GB × 4 = 40GB, leaving 24GB for system)
- Each agent gets dedicated core + RAM slice
- API models reserved for: web search, complex reasoning, final review

### Cost Savings
- Local inference: $0 (after download)
- API fallback: ~$0.20/call vs ~$0.01 local
- Estimated daily savings: $5-7

### Usage
```bash
# Start Ollama server
ollama serve

# Run inference
ollama run llama3.2:8b "Your prompt here"
```