"""
Task-Based Model Router V2
Advanced NLP Classification with Cost/Quality Optimization
"""

import re
import yaml
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import hashlib


class TaskType(Enum):
    CODING = "coding"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    SUMMARIZATION = "summarization"
    REASONING = "reasoning"
    CLASSIFICATION = "classification"
    CHAT = "chat"
    UNKNOWN = "unknown"


class Strategy(Enum):
    BALANCED = "balanced"
    QUALITY = "quality"
    COST = "cost"
    SPEED = "speed"


@dataclass
class TaskProfile:
    """Enriched task description with NLP features"""
    raw_prompt: str
    task_type: TaskType
    complexity: str  # simple, medium, complex, critical
    estimated_tokens: int
    keywords: List[str]
    context_length: int
    urgency_signals: List[str]
    privacy_sensitive: bool
    
    def to_dict(self) -> Dict:
        return {
            "raw_prompt": self.raw_prompt[:200] + "..." if len(self.raw_prompt) > 200 else self.raw_prompt,
            "task_type": self.task_type.value,
            "complexity": self.complexity,
            "estimated_tokens": self.estimated_tokens,
            "keywords": self.keywords,
            "context_length": self.context_length,
            "urgency_signals": self.urgency_signals,
            "privacy_sensitive": self.privacy_sensitive
        }


@dataclass
class ModelScore:
    """Scored model recommendation"""
    provider: str
    model: str
    quality_score: float
    cost_score: float
    speed_score: float
    composite_score: float
    estimated_cost: float
    reasoning: List[str]


@dataclass
class RoutingDecision:
    """Complete routing decision with audit trail"""
    request_id: str
    timestamp: str
    task_profile: TaskProfile
    selected_model: str
    selected_provider: str
    strategy: Strategy
    confidence: float
    all_scores: List[ModelScore]
    override_applied: Optional[str]
    estimated_cost: float
    reasoning: List[str]


class NLPClassifier:
    """NLP-based task classification with keyword extraction"""
    
    def __init__(self, config: Dict):
        self.task_types = config.get('task_types', {})
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for efficiency"""
        self.patterns = {}
        for task_type, config in self.task_types.items():
            indicators = config.get('complexity_indicators', [])
            pattern = r'\b(' + '|'.join(re.escape(k) for k in indicators) + r')\b'
            self.patterns[task_type] = re.compile(pattern, re.IGNORECASE)
    
    def classify(self, prompt: str) -> TaskProfile:
        """Classify a prompt into task type with feature extraction"""
        prompt_lower = prompt.lower()
        
        # Extract keywords (simple TF-like scoring)
        keywords = self._extract_keywords(prompt)
        
        # Determine task type
        task_type = self._determine_task_type(prompt)
        
        # Assess complexity
        complexity = self._assess_complexity(prompt, task_type)
        
        # Estimate tokens (rough heuristic)
        estimated_tokens = len(prompt.split()) * 1.5
        
        # Detect urgency
        urgency_signals = self._detect_urgency(prompt)
        
        # Privacy check
        privacy_sensitive = self._check_privacy(prompt)
        
        return TaskProfile(
            raw_prompt=prompt,
            task_type=task_type,
            complexity=complexity,
            estimated_tokens=int(estimated_tokens),
            keywords=keywords[:10],  # Top 10
            context_length=len(prompt),
            urgency_signals=urgency_signals,
            privacy_sensitive=privacy_sensitive
        )
    
    def _extract_keywords(self, prompt: str) -> List[str]:
        """Extract important keywords from prompt"""
        # Simple extraction - in production, use proper NLP
        words = re.findall(r'\b[a-zA-Z]{4,}\b', prompt.lower())
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Filter common stop words
        stop_words = {'this', 'that', 'with', 'from', 'have', 'been', 'they', 'their', 'would', 'there'}
        filtered = {k: v for k, v in word_freq.items() if k not in stop_words}
        
        return sorted(filtered.keys(), key=lambda x: filtered[x], reverse=True)
    
    def _determine_task_type(self, prompt: str) -> TaskType:
        """Determine task type based on keyword matching"""
        scores = {}
        
        for task_type, pattern in self.patterns.items():
            matches = len(pattern.findall(prompt))
            if matches > 0:
                scores[task_type] = matches
        
        if not scores:
            return TaskType.CHAT
        
        best_match = max(scores.items(), key=lambda x: x[1])
        return TaskType(best_match[0])
    
    def _assess_complexity(self, prompt: str, task_type: TaskType) -> str:
        """Assess task complexity based on multiple signals"""
        signals = 0
        
        # Length-based
        word_count = len(prompt.split())
        if word_count > 500:
            signals += 2
        elif word_count > 200:
            signals += 1
        
        # Structure-based
        if prompt.count('\n') > 10:
            signals += 1
        if re.search(r'\d+\.\s+\w+', prompt):  # Numbered lists
            signals += 1
        
        # Keyword-based
        complex_indicators = ['complex', 'advanced', 'architecture', 'system', 'optimize', 'improve', 'refactor']
        for indicator in complex_indicators:
            if indicator in prompt.lower():
                signals += 1
        
        # Determine level
        if signals >= 5:
            return "critical"
        elif signals >= 3:
            return "complex"
        elif signals >= 1:
            return "medium"
        return "simple"
    
    def _detect_urgency(self, prompt: str) -> List[str]:
        """Detect urgency signals in prompt"""
        urgency_words = ['urgent', 'asap', 'immediately', 'quick', 'fast', 'now', 'hurry', 'deadline']
        found = []
        for word in urgency_words:
            if word in prompt.lower():
                found.append(word)
        return found
    
    def _check_privacy(self, prompt: str) -> bool:
        """Check if prompt contains privacy-sensitive content"""
        privacy_words = ['password', 'secret', 'token', 'key', 'credential', 'private', 'confidential']
        return any(word in prompt.lower() for word in privacy_words)


class ProviderRegistry:
    """Registry of providers and their models with performance tracking"""
    
    def __init__(self, config: Dict):
        self.providers = config.get('providers', {})
        self.performance_history = {}
    
    def get_model_config(self, provider: str, model: str) -> Dict:
        """Get model configuration"""
        return self.providers.get(provider, {}).get('models', {}).get(model, {})
    
    def get_all_models(self) -> List[Tuple[str, str, Dict]]:
        """Get all available models with configs"""
        models = []
        for provider, data in self.providers.items():
            for model, config in data.get('models', {}).items():
                models.append((provider, model, config))
        return models
    
    def update_performance(self, provider: str, model: str, success: bool, latency: float):
        """Update performance tracking for a model"""
        key = f"{provider}/{model}"
        if key not in self.performance_history:
            self.performance_history[key] = {'successes': 0, 'failures': 0, 'latencies': []}
        
        if success:
            self.performance_history[key]['successes'] += 1
        else:
            self.performance_history[key]['failures'] += 1
        
        self.performance_history[key]['latencies'].append(latency)
        # Keep last 100 latency measurements
        self.performance_history[key]['latencies'] = self.performance_history[key]['latencies'][-100:]
    
    def get_success_rate(self, provider: str, model: str) -> float:
        """Get success rate for a model"""
        key = f"{provider}/{model}"
        hist = self.performance_history.get(key, {})
        successes = hist.get('successes', 0)
        failures = hist.get('failures', 0)
        total = successes + failures
        return successes / total if total > 0 else 0.9  # Default optimistic
    
    def get_avg_latency(self, provider: str, model: str) -> float:
        """Get average latency for a model"""
        key = f"{provider}/{model}"
        latencies = self.performance_history.get(key, {}).get('latencies', [])
        return sum(latencies) / len(latencies) if latencies else 1.0


class RoutingEngine:
    """Core routing engine with cost/quality optimization"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.classifier = NLPClassifier(self.config)
        self.registry = ProviderRegistry(self.config)
        self.history = RoutingHistory(self.config)
        self.override_engine = OverrideEngine(self.config)
    
    def _load_config(self, path: str) -> Dict:
        """Load configuration from YAML"""
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    
    def route(self, prompt: str, strategy: Optional[Strategy] = None, 
              force_model: Optional[str] = None, context_tokens: int = 0) -> RoutingDecision:
        """Route a prompt to the optimal model"""
        
        request_id = self._generate_request_id(prompt)
        timestamp = datetime.now().isoformat()
        
        # 1. Classify the task
        task_profile = self.classifier.classify(prompt)
        
        # 2. Check for overrides
        override = self.override_engine.check_overrides(prompt, context_tokens)
        
        # 3. Determine strategy
        if strategy is None:
            strategy = self._determine_strategy(task_profile)
        
        # 4. Score all models
        scores = self._score_models(task_profile, strategy)
        
        # 5. Apply learned preferences
        scores = self._apply_learning(scores, task_profile)
        
        # 6. Select best model
        if force_model:
            selected = self._parse_model_string(force_model)
            override_applied = f"forced: {force_model}"
        elif override:
            selected = self._parse_model_string(override['model'])
            override_applied = override['reason']
        else:
            best = max(scores, key=lambda x: x.composite_score)
            selected = (best.provider, best.model)
            override_applied = None
        
        selected_provider, selected_model = selected
        selected_config = self.registry.get_model_config(selected_provider, selected_model)
        estimated_cost = self._estimate_cost(task_profile.estimated_tokens, selected_config)
        
        # Build decision
        decision = RoutingDecision(
            request_id=request_id,
            timestamp=timestamp,
            task_profile=task_profile,
            selected_model=selected_model,
            selected_provider=selected_provider,
            strategy=strategy,
            confidence=self._calculate_confidence(scores),
            all_scores=sorted(scores, key=lambda x: x.composite_score, reverse=True),
            override_applied=override_applied,
            estimated_cost=estimated_cost,
            reasoning=self._build_reasoning(task_profile, strategy, override)
        )
        
        # Record decision
        self.history.record(decision)
        
        return decision
    
    def _generate_request_id(self, prompt: str) -> str:
        """Generate unique request ID"""
        hash_input = f"{prompt}{datetime.now().isoformat()}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]
    
    def _determine_strategy(self, task_profile: TaskProfile) -> Strategy:
        """Determine optimal routing strategy"""
        routing_config = self.config.get('routing', {})
        
        # Check budget pressure
        if routing_config.get('auto_switch_on_budget_pressure', False):
            daily_spend = self.history.get_daily_spend()
            budget_max = routing_config.get('budget_limits', {}).get('daily_max', 10.0)
            if daily_spend > budget_max * 0.8:
                return Strategy.COST
        
        # Check urgency
        if task_profile.urgency_signals and len(task_profile.urgency_signals) > 0:
            return Strategy.SPEED
        
        # Check complexity
        if task_profile.complexity in ['critical', 'complex']:
            return Strategy.QUALITY
        
        return Strategy(routing_config.get('default_strategy', 'balanced'))
    
    def _score_models(self, task_profile: TaskProfile, strategy: Strategy) -> List[ModelScore]:
        """Score all models based on task and strategy"""
        scores = []
        strategy_config = self.config.get('routing', {}).get('strategies', {}).get(strategy.value, {})
        
        qw = strategy_config.get('quality_weight', 0.4)
        cw = strategy_config.get('cost_weight', 0.3)
        sw = strategy_config.get('speed_weight', 0.3)
        
        for provider, model, config in self.registry.get_all_models():
            # Base scores from config
            quality = config.get('quality_score', 0.5)
            speed = config.get('speed_score', 0.5)
            
            # Adjust for task type
            task_type_config = self.config.get('task_types', {}).get(task_profile.task_type.value, {})
            preferred = task_type_config.get('preferred_models', [])
            if f"{provider}/{model}" in preferred or model in preferred:
                quality *= 1.1  # Boost preferred models
            
            # Calculate cost score (inverse of cost, normalized)
            input_cost = config.get('cost_per_1k_input', 0.01)
            output_cost = config.get('cost_per_1k_output', 0.03)
            avg_cost = (input_cost + output_cost) / 2
            cost_score = 1.0 / (1.0 + avg_cost * 100)  # Normalize
            
            # Apply performance history
            success_rate = self.registry.get_success_rate(provider, model)
            quality *= success_rate
            
            # Composite score
            composite = (quality * qw + cost_score * cw + speed * sw)
            
            estimated_cost = self._estimate_cost(task_profile.estimated_tokens, config)
            
            score = ModelScore(
                provider=provider,
                model=model,
                quality_score=round(quality, 3),
                cost_score=round(cost_score, 3),
                speed_score=round(speed, 3),
                composite_score=round(composite, 3),
                estimated_cost=round(estimated_cost, 6),
                reasoning=[
                    f"Base quality: {config.get('quality_score', 0.5)}",
                    f"Success rate: {success_rate:.2f}",
                    f"Strategy weights: Q={qw}, C={cw}, S={sw}"
                ]
            )
            scores.append(score)
        
        return scores
    
    def _apply_learning(self, scores: List[ModelScore], task_profile: TaskProfile) -> List[ModelScore]:
        """Apply learned preferences to scores"""
        learned = self.history.get_learned_preferences(task_profile.task_type.value)
        
        for score in scores:
            key = f"{score.provider}/{score.model}"
            if key in learned and learned[key]['confidence'] > 0.6:
                adjustment = learned[key]['performance_delta']
                score.composite_score += adjustment
                score.reasoning.append(f"Learning adjustment: {adjustment:+.3f}")
        
        return scores
    
    def _estimate_cost(self, estimated_tokens: int, config: Dict) -> float:
        """Estimate cost for a request"""
        input_cost = config.get('cost_per_1k_input', 0.01)
        output_cost = config.get('cost_per_1k_output', 0.03)
        
        # Assume 2:1 output:input ratio
        input_tokens = estimated_tokens
        output_tokens = estimated_tokens * 0.5
        
        cost = (input_tokens / 1000 * input_cost) + (output_tokens / 1000 * output_cost)
        return cost
    
    def _parse_model_string(self, model_string: str) -> Tuple[str, str]:
        """Parse provider/model string"""
        if '/' in model_string:
            parts = model_string.split('/')
            return (parts[0], parts[1])
        # Default to openrouter if no provider specified
        return ('openrouter', model_string)
    
    def _calculate_confidence(self, scores: List[ModelScore]) -> float:
        """Calculate confidence in routing decision"""
        if len(scores) < 2:
            return 0.5
        
        sorted_scores = sorted(scores, key=lambda x: x.composite_score, reverse=True)
        gap = sorted_scores[0].composite_score - sorted_scores[1].composite_score
        
        # Normalize gap to 0-1 confidence
        confidence = min(0.5 + gap * 2, 0.95)
        return round(confidence, 2)
    
    def _build_reasoning(self, task_profile: TaskProfile, strategy: Strategy, 
                         override: Optional[Dict]) -> List[str]:
        """Build human-readable reasoning"""
        reasoning = [
            f"Task classified as: {task_profile.task_type.value} ({task_profile.complexity})",
            f"Optimization strategy: {strategy.value}",
            f"Estimated tokens: {task_profile.estimated_tokens}",
        ]
        
        if task_profile.privacy_sensitive:
            reasoning.append("Privacy-sensitive content detected")
        
        if override:
            reasoning.append(f"Override applied: {override['reason']}")
        
        return reasoning
    
    def provide_feedback(self, request_id: str, quality_rating: float, 
                         actual_cost: Optional[float] = None):
        """Provide feedback on a routing decision"""
        self.history.record_feedback(request_id, quality_rating, actual_cost)


class OverrideEngine:
    """Handle override rules and edge cases"""
    
    def __init__(self, config: Dict):
        self.overrides = config.get('overrides', {})
    
    def check_overrides(self, prompt: str, context_tokens: int) -> Optional[Dict]:
        """Check if any override rules apply"""
        
        # Check force rules
        for rule in self.overrides.get('force_rules', []):
            pattern = rule.get('pattern', '')
            if re.search(pattern, prompt):
                return {
                    'model': rule.get('model'),
                    'reason': rule.get('reason', 'Rule match')
                }
        
        # Check block patterns
        for rule in self.overrides.get('block_patterns', []):
            pattern = rule.get('pattern', '')
            if re.search(pattern, prompt):
                raise ValueError(f"Request blocked: {rule.get('reason', 'Pattern match')}")
        
        # Check context rules
        for rule in self.overrides.get('context_rules', []):
            max_tokens = rule.get('max_tokens', 0)
            if context_tokens > max_tokens:
                return {
                    'model': rule.get('model'),
                    'reason': rule.get('reason', 'Context length')
                }
        
        return None


class RoutingHistory:
    """Track and learn from routing history"""
    
    def __init__(self, config: Dict):
        self.config = config.get('learning', {})
        self.history_file = Path(self.config.get('history_file', 'data/history/routing_history.jsonl'))
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        self._cache = []
    
    def record(self, decision: RoutingDecision):
        """Record a routing decision"""
        record = {
            'request_id': decision.request_id,
            'timestamp': decision.timestamp,
            'task_type': decision.task_profile.task_type.value,
            'complexity': decision.task_profile.complexity,
            'selected_provider': decision.selected_provider,
            'selected_model': decision.selected_model,
            'strategy': decision.strategy.value,
            'estimated_cost': decision.estimated_cost,
            'confidence': decision.confidence
        }
        
        with open(self.history_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
        
        self._cache.append(record)
    
    def record_feedback(self, request_id: str, quality_rating: float, 
                        actual_cost: Optional[float] = None):
        """Record feedback for a decision"""
        feedback_file = self.history_file.parent / 'feedback.jsonl'
        
        record = {
            'request_id': request_id,
            'timestamp': datetime.now().isoformat(),
            'quality_rating': quality_rating,
            'actual_cost': actual_cost
        }
        
        with open(feedback_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
    
    def get_daily_spend(self) -> float:
        """Get estimated spend for today"""
        today = datetime.now().strftime('%Y-%m-%d')
        total = 0.0
        
        try:
            with open(self.history_file, 'r') as f:
                for line in f:
                    record = json.loads(line)
                    if record['timestamp'].startswith(today):
                        total += record.get('estimated_cost', 0)
        except FileNotFoundError:
            pass
        
        return total
    
    def get_learned_preferences(self, task_type: str) -> Dict[str, Dict]:
        """Get learned model preferences for a task type"""
        # In production, this would do proper statistical analysis
        # For now, return empty dict as placeholder
        return {}


# Convenience function for quick routing
def route(prompt: str, strategy: str = "balanced", **kwargs) -> RoutingDecision:
    """Quick routing function"""
    engine = RoutingEngine()
    return engine.route(prompt, Strategy(strategy), **kwargs)
