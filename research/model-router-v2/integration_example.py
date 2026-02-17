#!/usr/bin/env python3
"""
Integration Example: Model Router V2 with API Execution
Shows how to route AND execute requests with selected models
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))

from router import RoutingEngine, Strategy


class ModelExecutor:
    """Execute requests with routed models"""
    
    def __init__(self):
        self.router = RoutingEngine()
        self.executors = {
            'local': self._execute_local,
            'openrouter': self._execute_openrouter,
            'moonshot': self._execute_moonshot,
        }
    
    def execute(self, prompt: str, strategy: str = "balanced", **kwargs):
        """
        Route and execute a prompt
        
        Returns: dict with result, model used, cost, etc.
        """
        # 1. Route to optimal model
        decision = self.router.route(prompt, Strategy(strategy))
        
        print(f"🎯 Routed to: {decision.selected_provider}/{decision.selected_model}")
        print(f"   Strategy: {decision.strategy.value}")
        print(f"   Est. Cost: ${decision.estimated_cost:.6f}")
        print(f"   Confidence: {decision.confidence:.0%}")
        
        if decision.override_applied:
            print(f"   Override: {decision.override_applied}")
        
        # 2. Execute with selected model
        executor = self.executors.get(decision.selected_provider)
        if not executor:
            return {
                'success': False,
                'error': f"No executor for provider: {decision.selected_provider}"
            }
        
        try:
            result = executor(decision.selected_model, prompt)
            
            # 3. Record success for learning
            self.router.registry.update_performance(
                decision.selected_provider,
                decision.selected_model,
                success=True,
                latency=result.get('latency', 1.0)
            )
            
            return {
                'success': True,
                'request_id': decision.request_id,
                'provider': decision.selected_provider,
                'model': decision.selected_model,
                'content': result.get('content'),
                'latency': result.get('latency'),
                'cost': decision.estimated_cost
            }
            
        except Exception as e:
            # Record failure
            self.router.registry.update_performance(
                decision.selected_provider,
                decision.selected_model,
                success=False,
                latency=0
            )
            return {
                'success': False,
                'error': str(e)
            }
    
    def _execute_local(self, model: str, prompt: str) -> dict:
        """Execute with local Ollama instance"""
        import requests
        import time
        
        start = time.time()
        
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': model,
                'prompt': prompt,
                'stream': False
            },
            timeout=120
        )
        response.raise_for_status()
        
        latency = time.time() - start
        data = response.json()
        
        return {
            'content': data.get('response'),
            'latency': latency
        }
    
    def _execute_openrouter(self, model: str, prompt: str) -> dict:
        """Execute with OpenRouter API"""
        import requests
        import time
        
        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        
        start = time.time()
        
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': f"openai/{model}" if not '/' in model else model,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=60
        )
        response.raise_for_status()
        
        latency = time.time() - start
        data = response.json()
        
        return {
            'content': data['choices'][0]['message']['content'],
            'latency': latency
        }
    
    def _execute_moonshot(self, model: str, prompt: str) -> dict:
        """Execute with Moonshot API"""
        import requests
        import time
        
        api_key = os.getenv('MOONSHOT_API_KEY')
        if not api_key:
            raise ValueError("MOONSHOT_API_KEY not set")
        
        start = time.time()
        
        response = requests.post(
            'https://api.moonshot.cn/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=60
        )
        response.raise_for_status()
        
        latency = time.time() - start
        data = response.json()
        
        return {
            'content': data['choices'][0]['message']['content'],
            'latency': latency
        }


def main():
    """Demo the integration"""
    executor = ModelExecutor()
    
    test_prompts = [
        ("Write a Python function to reverse a string", "balanced"),
        ("Analyze the tradeoffs between REST and GraphQL", "quality"),
        ("Summarize: The quick brown fox jumps over the lazy dog", "cost"),
    ]
    
    print("=" * 60)
    print("🚀 Model Router V2 - Integration Demo")
    print("=" * 60)
    
    for prompt, strategy in test_prompts:
        print(f"\n📤 Prompt: {prompt[:50]}...")
        print(f"   Strategy: {strategy}")
        print("-" * 60)
        
        result = executor.execute(prompt, strategy)
        
        if result['success']:
            print(f"✅ Success!")
            print(f"   Model: {result['provider']}/{result['model']}")
            print(f"   Latency: {result['latency']:.2f}s")
            print(f"   Cost: ${result['cost']:.6f}")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("=" * 60)


if __name__ == '__main__':
    main()
