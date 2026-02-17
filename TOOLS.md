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

### Installed Models

| Model | Size | RAM | Use Case | Status |
|-------|------|-----|----------|--------|
| **qwen2.5:7b** | 4.7GB | ~6GB | General tasks, quick queries | ✅ Tested |
| **qwen2.5:14b** | 9.0GB | ~12GB | Complex reasoning, analysis | ✅ Installed |
| **qwen2.5-coder:7b** | 4.7GB | ~6GB | Coding, code review | ✅ Installed |
| **qwen2.5-coder:32b** | 19GB | ~24GB | Complex coding tasks | ✅ Installed |
| **llama3.1:8b** | 4.9GB | ~6GB | General tasks, summaries | ✅ Installed |

### Performance Notes

- **qwen2.5:7b test** ("What is 2+2?"): 7.6s total, 3.35 tokens/s eval rate
- Cold start ~2.8s (model loading), subsequent runs faster
- 7b models: ~3-5 tokens/s, 14b: ~2-3 tokens/s, 32b: ~1-2 tokens/s

### Concurrency (6 Cores)
- Can run 2-3 models simultaneously depending on size
- 7b models use ~6GB RAM each, 14b uses ~12GB, 32b uses ~24GB
- API models reserved for: web search, complex reasoning, final review

### Known Issues
- **llama3.2:8b** listed in old docs but NOT installed - needs `ollama pull llama3.2:8b`
- qwen2.5-coder:32b is large (19GB) - may cause memory pressure if running other models

### Usage
```bash
# Start Ollama server (if not running)
ollama serve

# List installed models
ollama list

# Run inference
ollama run qwen2.5:7b "Your prompt here"

# Pull a new model
ollama pull llama3.2:8b
```