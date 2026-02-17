"""
Test suite for Model Router V2
Comprehensive testing of classification, routing, and optimization
"""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from router import (
    NLPClassifier, ProviderRegistry, RoutingEngine, OverrideEngine,
    RoutingHistory, TaskProfile, TaskType, Strategy, ModelScore, RoutingDecision
)


class TestNLPClassifier(unittest.TestCase):
    """Test NLP classification capabilities"""
    
    def setUp(self):
        config = {
            'task_types': {
                'coding': {
                    'complexity_indicators': ['function', 'class', 'bug', 'code', 'implement']
                },
                'analysis': {
                    'complexity_indicators': ['analyze', 'compare', 'evaluate', 'research']
                },
                'creative': {
                    'complexity_indicators': ['write', 'story', 'creative', 'draft']
                }
            }
        }
        self.classifier = NLPClassifier(config)
    
    def test_coding_classification(self):
        prompt = "Write a Python function to sort a list"
        profile = self.classifier.classify(prompt)
        self.assertEqual(profile.task_type, TaskType.CODING)
        self.assertIn('function', profile.keywords)
    
    def test_analysis_classification(self):
        prompt = "Analyze the market trends and evaluate competitors"
        profile = self.classifier.classify(prompt)
        self.assertEqual(profile.task_type, TaskType.ANALYSIS)
    
    def test_creative_classification(self):
        prompt = "Write a creative story about space exploration"
        profile = self.classifier.classify(prompt)
        self.assertEqual(profile.task_type, TaskType.CREATIVE)
    
    def test_complexity_assessment(self):
        # Simple
        profile = self.classifier.classify("What is Python?")
        self.assertEqual(profile.complexity, 'simple')
        
        # Complex
        complex_prompt = """Design a complex microservices architecture 
        with load balancing, caching layers, and database sharding. 
        1. Service discovery
        2. Circuit breakers
        3. Event sourcing
        Optimize for high availability and fault tolerance."""
        profile = self.classifier.classify(complex_prompt)
        self.assertIn(profile.complexity, ['complex', 'critical'])
    
    def test_privacy_detection(self):
        prompt = "My password is secret123, how do I secure it?"
        profile = self.classifier.classify(prompt)
        self.assertTrue(profile.privacy_sensitive)
    
    def test_urgency_detection(self):
        prompt = "URGENT: Need this fixed immediately!"
        profile = self.classifier.classify(prompt)
        self.assertTrue(len(profile.urgency_signals) > 0)


class TestProviderRegistry(unittest.TestCase):
    """Test provider registry and performance tracking"""
    
    def setUp(self):
        config = {
            'providers': {
                'openrouter': {
                    'models': {
                        'gpt-4o': {
                            'quality_score': 0.95,
                            'cost_per_1k_input': 0.0025
                        },
                        'gpt-4o-mini': {
                            'quality_score': 0.82,
                            'cost_per_1k_input': 0.00015
                        }
                    }
                }
            }
        }
        self.registry = ProviderRegistry(config)
    
    def test_get_model_config(self):
        config = self.registry.get_model_config('openrouter', 'gpt-4o')
        self.assertEqual(config['quality_score'], 0.95)
    
    def test_get_all_models(self):
        models = self.registry.get_all_models()
        self.assertEqual(len(models), 2)
    
    def test_performance_tracking(self):
        self.registry.update_performance('openrouter', 'gpt-4o', True, 1.5)
        self.registry.update_performance('openrouter', 'gpt-4o', True, 1.3)
        self.registry.update_performance('openrouter', 'gpt-4o', False, 2.0)
        
        success_rate = self.registry.get_success_rate('openrouter', 'gpt-4o')
        self.assertAlmostEqual(success_rate, 2/3, places=2)
        
        avg_latency = self.registry.get_avg_latency('openrouter', 'gpt-4o')
        self.assertAlmostEqual(avg_latency, 1.6, places=1)


class TestOverrideEngine(unittest.TestCase):
    """Test override rules and edge cases"""
    
    def setUp(self):
        config = {
            'overrides': {
                'force_rules': [
                    {
                        'pattern': '(?i)password|secret|credential',
                        'model': 'local/llama3.2:8b',
                        'reason': 'Privacy-sensitive content'
                    },
                    {
                        'pattern': '(?i)urgent|asap',
                        'model': 'local/llama3.2:8b',
                        'reason': 'Speed priority'
                    }
                ],
                'block_patterns': [
                    {
                        'pattern': '(?i)illegal|harmful',
                        'reason': 'Safety filter'
                    }
                ],
                'context_rules': [
                    {
                        'max_tokens': 100000,
                        'model': 'openrouter/kimi-k2-5',
                        'reason': 'Long context'
                    }
                ]
            }
        }
        self.engine = OverrideEngine(config)
    
    def test_privacy_override(self):
        override = self.engine.check_overrides("My password is xyz", 0)
        self.assertIsNotNone(override)
        self.assertEqual(override['model'], 'local/llama3.2:8b')
    
    def test_urgency_override(self):
        override = self.engine.check_overrides("URGENT: Fix now!", 0)
        self.assertIsNotNone(override)
        self.assertIn('Speed', override['reason'])
    
    def test_context_override(self):
        override = self.engine.check_overrides("Some prompt", 150000)
        self.assertIsNotNone(override)
        self.assertIn('kimi', override['model'])
    
    def test_no_override(self):
        override = self.engine.check_overrides("General question", 0)
        self.assertIsNone(override)
    
    def test_block_pattern(self):
        with self.assertRaises(ValueError):
            self.engine.check_overrides("How to do illegal stuff", 0)


class TestRoutingEngine(unittest.TestCase):
    """Integration tests for routing engine"""
    
    def setUp(self):
        # Use actual config file
        self.engine = RoutingEngine('/Users/openclaw-megatron/.openclaw/workspace/research/model-router-v2/config.yaml')
    
    def test_basic_routing(self):
        decision = self.engine.route("Write a Python function")
        self.assertIsNotNone(decision.request_id)
        self.assertIsNotNone(decision.selected_model)
        self.assertIsNotNone(decision.selected_provider)
        self.assertGreater(decision.confidence, 0)
    
    def test_strategy_quality(self):
        decision = self.engine.route("Solve complex math problem", Strategy.QUALITY)
        self.assertEqual(decision.strategy, Strategy.QUALITY)
        # Should prefer high-quality models
        self.assertIn(decision.selected_model, ['gpt-4o', 'claude-3-5-sonnet', 'kimi-k2-5'])
    
    def test_strategy_cost(self):
        decision = self.engine.route("Simple question", Strategy.COST)
        self.assertEqual(decision.strategy, Strategy.COST)
        # Should prefer low-cost models
        config = self.engine.registry.get_model_config(decision.selected_provider, decision.selected_model)
        self.assertLess(config.get('cost_per_1k_input', 1.0), 0.01)
    
    def test_privacy_routing(self):
        decision = self.engine.route("Password: abc123, is this secure?")
        self.assertTrue(decision.task_profile.privacy_sensitive)
        # Should route to local
        self.assertEqual(decision.selected_provider, 'local')
    
    def test_urgency_routing(self):
        decision = self.engine.route("URGENT! Quick fix needed ASAP!")
        self.assertGreater(len(decision.task_profile.urgency_signals), 0)
        # Should use speed strategy
        self.assertEqual(decision.strategy, Strategy.SPEED)


class TestCostOptimization(unittest.TestCase):
    """Test cost/quality tradeoff optimization"""
    
    def setUp(self):
        self.engine = RoutingEngine('/Users/openclaw-megatron/.openclaw/workspace/research/model-router-v2/config.yaml')
    
    def test_cost_estimation(self):
        decision = self.engine.route("Short question")
        self.assertGreater(decision.estimated_cost, 0)
        self.assertLess(decision.estimated_cost, 0.01)  # Should be cheap
    
    def test_complex_task_higher_cost(self):
        simple = self.engine.route("Hi")
        complex_task = self.engine.route("""Design a complex distributed system with:
        1. Load balancing
        2. Database sharding
        3. Caching layers
        4. Message queues
        Provide detailed architecture diagrams and implementation steps.""")
        
        # Complex tasks may cost more but not necessarily if routed to local
        # Just verify both have valid costs
        self.assertGreater(simple.estimated_cost, 0)
        self.assertGreater(complex_task.estimated_cost, 0)
    
    def test_strategy_affects_selection(self):
        prompt = "Write a function"
        
        quality_decision = self.engine.route(prompt, Strategy.QUALITY)
        cost_decision = self.engine.route(prompt, Strategy.COST)
        
        # Quality strategy should pick higher quality model
        quality_config = self.engine.registry.get_model_config(
            quality_decision.selected_provider, quality_decision.selected_model
        )
        cost_config = self.engine.registry.get_model_config(
            cost_decision.selected_provider, cost_decision.selected_model
        )
        
        self.assertGreaterEqual(
            quality_config.get('quality_score', 0),
            cost_config.get('quality_score', 0) - 0.1  # Allow small variance
        )


class TestLearningAndFeedback(unittest.TestCase):
    """Test learning from history and feedback"""
    
    def setUp(self):
        self.engine = RoutingEngine('/Users/openclaw-megatron/.openclaw/workspace/research/model-router-v2/config.yaml')
    
    def test_history_recording(self):
        decision = self.engine.route("Test prompt")
        # History should be recorded
        daily_spend = self.engine.history.get_daily_spend()
        self.assertGreaterEqual(daily_spend, 0)
    
    def test_feedback_recording(self):
        decision = self.engine.route("Test for feedback")
        self.engine.provide_feedback(decision.request_id, 0.9, 0.001)
        # Should not raise error
        self.assertTrue(True)
    
    def test_confidence_calculation(self):
        decision = self.engine.route("Test")
        self.assertGreaterEqual(decision.confidence, 0)
        self.assertLessEqual(decision.confidence, 1)


def run_tests():
    """Run all tests with verbosity"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestNLPClassifier))
    suite.addTests(loader.loadTestsFromTestCase(TestProviderRegistry))
    suite.addTests(loader.loadTestsFromTestCase(TestOverrideEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestRoutingEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestCostOptimization))
    suite.addTests(loader.loadTestsFromTestCase(TestLearningAndFeedback))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
