/**
 * Hardware Detector - Detects local hardware capabilities
 * Supports: macOS, Linux, Windows
 */

import { execSync } from 'child_process';
import { platform } from 'os';

export class HardwareDetector {
  constructor() {
    this.platform = platform();
    this.cache = null;
  }

  /**
   * Detect all hardware capabilities
   */
  async detect() {
    if (this.cache) return this.cache;

    const hardware = {
      platform: this.platform,
      timestamp: new Date().toISOString(),
      cpu: this.detectCPU(),
      memory: this.detectMemory(),
      gpu: this.detectGPU(),
      ollama: await this.detectOllama()
    };

    this.cache = hardware;
    return hardware;
  }

  /**
   * Detect CPU information
   */
  detectCPU() {
    try {
      if (this.platform === 'darwin') {
        const output = execSync('sysctl -n hw.ncpu hw.physicalcpu machdep.cpu.brand_string', { encoding: 'utf8' });
        const [logicalCores, physicalCores, model] = output.trim().split('\n');
        
        return {
          model: model?.trim() || 'Unknown',
          cores: parseInt(logicalCores) || 0,
          physicalCores: parseInt(physicalCores) || 0,
          threadsPerCore: Math.round(parseInt(logicalCores) / parseInt(physicalCores)) || 1
        };
      } else if (this.platform === 'linux') {
        const cpuinfo = execSync('cat /proc/cpuinfo | grep -E "model name|processor" | head -2', { encoding: 'utf8' });
        const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
        const cores = parseInt(execSync('nproc', { encoding: 'utf8' }).trim());
        
        return {
          model: modelMatch?.[1]?.trim() || 'Unknown',
          cores,
          physicalCores: cores,
          threadsPerCore: 1
        };
      } else {
        return { model: 'Unknown', cores: 4, physicalCores: 4, threadsPerCore: 1 };
      }
    } catch (error) {
      console.warn('Failed to detect CPU:', error.message);
      return { model: 'Unknown', cores: 4, physicalCores: 4, threadsPerCore: 1 };
    }
  }

  /**
   * Detect memory (RAM) information
   */
  detectMemory() {
    try {
      if (this.platform === 'darwin') {
        const totalBytes = execSync('sysctl -n hw.memsize', { encoding: 'utf8' }).trim();
        const pageSize = execSync('sysctl -n hw.pagesize', { encoding: 'utf8' }).trim();
        const vmStats = execSync('vm_stat', { encoding: 'utf8' });
        
        const totalGB = Math.round(parseInt(totalBytes) / (1024 ** 3));
        
        // Parse vm_stat for used memory
        const freeMatch = vmStats.match(/Pages free:\s+(\d+)/);
        const inactiveMatch = vmStats.match(/Pages inactive:\s+(\d+)/);
        const pageSizeNum = parseInt(pageSize);
        
        const freePages = parseInt(freeMatch?.[1] || '0');
        const inactivePages = parseInt(inactiveMatch?.[1] || '0');
        const freeGB = Math.round(((freePages + inactivePages) * pageSizeNum) / (1024 ** 3));
        
        return {
          totalGB,
          freeGB,
          usedGB: totalGB - freeGB,
          availableGB: freeGB
        };
      } else if (this.platform === 'linux') {
        const meminfo = execSync('cat /proc/meminfo', { encoding: 'utf8' });
        const totalMatch = meminfo.match(/MemTotal:\s+(\d+)/);
        const availableMatch = meminfo.match(/MemAvailable:\s+(\d+)/);
        
        const totalGB = Math.round(parseInt(totalMatch?.[1] || '0') / 1024);
        const availableGB = Math.round(parseInt(availableMatch?.[1] || '0') / 1024);
        
        return {
          totalGB,
          freeGB: availableGB,
          usedGB: totalGB - availableGB,
          availableGB
        };
      } else {
        return { totalGB: 16, freeGB: 8, usedGB: 8, availableGB: 8 };
      }
    } catch (error) {
      console.warn('Failed to detect memory:', error.message);
      return { totalGB: 16, freeGB: 8, usedGB: 8, availableGB: 8 };
    }
  }

  /**
   * Detect GPU information
   */
  detectGPU() {
    try {
      if (this.platform === 'darwin') {
        // Check for Apple Silicon GPU or AMD GPU
        const output = execSync('system_profiler SPDisplaysDataType 2>/dev/null || echo "Unknown"', { 
          encoding: 'utf8',
          timeout: 5000 
        });
        
        const chipMatch = output.match(/Chipset Model:\s*(.+)/);
        const vramMatch = output.match(/VRAM .Total.:\s*(\d+)/);
        const metalSupport = output.includes('Metal') || output.includes('Apple');
        const isAppleSilicon = output.includes('Apple') && !output.includes('AMD') && !output.includes('Intel');
        
        return {
          model: chipMatch?.[1]?.trim() || 'Unknown',
          vramGB: vramMatch ? parseInt(vramMatch[1]) / 1024 : (isAppleSilicon ? 'Shared' : 0),
          metalSupport,
          isAppleSilicon,
          unifiedMemory: isAppleSilicon
        };
      } else if (this.platform === 'linux') {
        try {
          const nvidiaOutput = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null', { 
            encoding: 'utf8',
            timeout: 3000 
          });
          const [name, mem] = nvidiaOutput.trim().split(',');
          const memMB = parseInt(mem?.replace(' MiB', '') || '0');
          
          return {
            model: name?.trim() || 'NVIDIA GPU',
            vramGB: Math.round(memMB / 1024),
            metalSupport: false,
            isAppleSilicon: false,
            unifiedMemory: false
          };
        } catch {
          return { model: 'Unknown', vramGB: 0, metalSupport: false, isAppleSilicon: false, unifiedMemory: false };
        }
      } else {
        return { model: 'Unknown', vramGB: 0, metalSupport: false, isAppleSilicon: false, unifiedMemory: false };
      }
    } catch (error) {
      console.warn('Failed to detect GPU:', error.message);
      return { model: 'Unknown', vramGB: 0, metalSupport: false, isAppleSilicon: false, unifiedMemory: false };
    }
  }

  /**
   * Detect Ollama availability and running models
   */
  async detectOllama() {
    try {
      const checkOllama = execSync('which ollama', { encoding: 'utf8', timeout: 2000 });
      if (!checkOllama) return { available: false, running: false, models: [] };

      // Check if server is running
      let running = false;
      try {
        execSync('curl -s http://localhost:11434/api/tags > /dev/null', { timeout: 2000 });
        running = true;
      } catch {
        running = false;
      }

      // Get installed models
      let models = [];
      try {
        const output = execSync('ollama list 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
        models = output.split('\n')
          .slice(1) // Skip header
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              name: parts[0],
              size: parts[2] || 'unknown',
              modified: parts.slice(3).join(' ') || 'unknown'
            };
          });
      } catch {
        models = [];
      }

      return { available: true, running, models };
    } catch (error) {
      return { available: false, running: false, models: [] };
    }
  }

  /**
   * Get a hardware capability score (0-100)
   * Based on available resources
   */
  async getCapabilityScore() {
    const hw = await this.detect();
    
    // Memory score (0-40 points)
    const memScore = Math.min(40, (hw.memory.availableGB / 8) * 40);
    
    // CPU score (0-30 points)
    const cpuScore = Math.min(30, (hw.cpu.cores / 4) * 30);
    
    // GPU score (0-30 points)
    let gpuScore = 0;
    if (hw.gpu.isAppleSilicon) {
      gpuScore = 30; // Unified memory advantage
    } else if (hw.gpu.vramGB >= 8) {
      gpuScore = 25;
    } else if (hw.gpu.vramGB >= 4) {
      gpuScore = 15;
    }

    return Math.round(memScore + cpuScore + gpuScore);
  }

  /**
   * Clear the hardware cache
   */
  clearCache() {
    this.cache = null;
  }
}

export default HardwareDetector;
