#!/usr/bin/env python3
"""
Model Router V2 CLI
Command-line interface for task-based model routing
"""

import sys
import json
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from router import RoutingEngine, Strategy, route


def main():
    parser = argparse.ArgumentParser(
        description='Task-Based Model Router V2',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s route "Write a Python function to calculate fibonacci"
  %(prog)s route "Summarize this article" --strategy cost
  %(prog)s route "Debug this error" --strategy quality --verbose
  %(prog)s history --last 10
  %(prog)s stats
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Route command
    route_parser = subparsers.add_parser('route', help='Route a prompt to optimal model')
    route_parser.add_argument('prompt', help='The prompt to route')
    route_parser.add_argument('-s', '--strategy', 
                              choices=['balanced', 'quality', 'cost', 'speed'],
                              default='balanced',
                              help='Routing strategy (default: balanced)')
    route_parser.add_argument('-f', '--force', 
                              help='Force specific model (provider/model)')
    route_parser.add_argument('-v', '--verbose', action='store_true',
                              help='Show detailed scoring')
    route_parser.add_argument('--json', action='store_true',
                              help='Output as JSON')
    
    # History command
    history_parser = subparsers.add_parser('history', help='Show routing history')
    history_parser.add_argument('--last', type=int, default=10,
                                help='Show last N decisions')
    history_parser.add_argument('--json', action='store_true',
                                help='Output as JSON')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show routing statistics')
    stats_parser.add_argument('--days', type=int, default=7,
                              help='Stats for last N days')
    
    # Feedback command
    feedback_parser = subparsers.add_parser('feedback', help='Provide feedback on routing')
    feedback_parser.add_argument('request_id', help='Request ID from previous routing')
    feedback_parser.add_argument('rating', type=float, help='Quality rating (0-1)')
    feedback_parser.add_argument('--cost', type=float, help='Actual cost incurred')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Run test suite')
    test_parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.command == 'route':
        cmd_route(args)
    elif args.command == 'history':
        cmd_history(args)
    elif args.command == 'stats':
        cmd_stats(args)
    elif args.command == 'feedback':
        cmd_feedback(args)
    elif args.command == 'test':
        cmd_test(args)
    else:
        parser.print_help()


def cmd_route(args):
    """Handle route command"""
    engine = RoutingEngine()
    strategy = Strategy(args.strategy)
    
    decision = engine.route(
        prompt=args.prompt,
        strategy=strategy,
        force_model=args.force
    )
    
    if args.json:
        output = {
            'request_id': decision.request_id,
            'provider': decision.selected_provider,
            'model': decision.selected_model,
            'strategy': decision.strategy.value,
            'confidence': decision.confidence,
            'estimated_cost': decision.estimated_cost,
            'task_type': decision.task_profile.task_type.value,
            'complexity': decision.task_profile.complexity,
            'override': decision.override_applied,
            'reasoning': decision.reasoning
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"🎯 ROUTING DECISION")
        print(f"{'='*60}")
        print(f"Request ID:  {decision.request_id}")
        print(f"Provider:    {decision.selected_provider}")
        print(f"Model:       {decision.selected_model}")
        print(f"Strategy:    {decision.strategy.value}")
        print(f"Confidence:  {decision.confidence:.0%}")
        print(f"Est. Cost:   ${decision.estimated_cost:.6f}")
        print(f"\nTask Profile:")
        print(f"  Type:      {decision.task_profile.task_type.value}")
        print(f"  Complexity: {decision.task_profile.complexity}")
        print(f"  Tokens:    ~{decision.task_profile.estimated_tokens}")
        if decision.task_profile.privacy_sensitive:
            print(f"  ⚠️  Privacy-sensitive content detected")
        if decision.override_applied:
            print(f"\n⚡ Override: {decision.override_applied}")
        print(f"\nReasoning:")
        for reason in decision.reasoning:
            print(f"  • {reason}")
        
        if args.verbose:
            print(f"\n{'='*60}")
            print("📊 ALL MODEL SCORES")
            print(f"{'='*60}")
            print(f"{'Provider':<15} {'Model':<25} {'Score':>8} {'Cost':>12}")
            print("-" * 60)
            for score in decision.all_scores[:10]:
                print(f"{score.provider:<15} {score.model:<25} {score.composite_score:>8.3f} ${score.estimated_cost:>10.6f}")
        
        print(f"\n{'='*60}")


def cmd_history(args):
    """Handle history command"""
    history_file = Path('data/history/routing_history.jsonl')
    
    if not history_file.exists():
        print("No routing history found.")
        return
    
    records = []
    with open(history_file, 'r') as f:
        for line in f:
            records.append(json.loads(line))
    
    records = records[-args.last:]
    
    if args.json:
        print(json.dumps(records, indent=2))
    else:
        print(f"\n{'='*80}")
        print(f"📜 LAST {len(records)} ROUTING DECISIONS")
        print(f"{'='*80}")
        print(f"{'Time':<20} {'Task':<12} {'Model':<25} {'Strategy':<10} {'Cost':>10}")
        print("-" * 80)
        for r in reversed(records):
            time = r['timestamp'][:19]
            model = f"{r['selected_provider']}/{r['selected_model']}"[:24]
            print(f"{time:<20} {r['task_type']:<12} {model:<25} {r['strategy']:<10} ${r['estimated_cost']:>8.6f}")
        print(f"{'='*80}\n")


def cmd_stats(args):
    """Handle stats command"""
    history_file = Path('data/history/routing_history.jsonl')
    
    if not history_file.exists():
        print("No routing history found.")
        return
    
    records = []
    with open(history_file, 'r') as f:
        for line in f:
            records.append(json.loads(line))
    
    # Calculate stats
    total_requests = len(records)
    total_cost = sum(r['estimated_cost'] for r in records)
    
    strategy_counts = {}
    task_counts = {}
    model_counts = {}
    
    for r in records:
        strategy_counts[r['strategy']] = strategy_counts.get(r['strategy'], 0) + 1
        task_counts[r['task_type']] = task_counts.get(r['task_type'], 0) + 1
        model_key = f"{r['selected_provider']}/{r['selected_model']}"
        model_counts[model_key] = model_counts.get(model_key, 0) + 1
    
    print(f"\n{'='*60}")
    print(f"📊 ROUTING STATISTICS")
    print(f"{'='*60}")
    print(f"Total Requests: {total_requests}")
    print(f"Total Est. Cost: ${total_cost:.4f}")
    print(f"Avg Cost/Request: ${total_cost/total_requests:.6f}" if total_requests > 0 else "N/A")
    
    print(f"\nBy Strategy:")
    for strategy, count in sorted(strategy_counts.items(), key=lambda x: -x[1]):
        pct = count / total_requests * 100
        print(f"  {strategy:<12} {count:>4} ({pct:.1f}%)")
    
    print(f"\nBy Task Type:")
    for task, count in sorted(task_counts.items(), key=lambda x: -x[1]):
        pct = count / total_requests * 100
        print(f"  {task:<12} {count:>4} ({pct:.1f}%)")
    
    print(f"\nTop Models:")
    for model, count in sorted(model_counts.items(), key=lambda x: -x[1])[:5]:
        pct = count / total_requests * 100
        print(f"  {model:<30} {count:>4} ({pct:.1f}%)")
    
    print(f"{'='*60}\n")


def cmd_feedback(args):
    """Handle feedback command"""
    engine = RoutingEngine()
    engine.provide_feedback(args.request_id, args.rating, args.cost)
    print(f"✅ Feedback recorded for request {args.request_id}")


def cmd_test(args):
    """Handle test command"""
    print("\n🧪 Running Model Router V2 Test Suite\n")
    
    test_cases = [
        {
            'name': 'Simple coding task',
            'prompt': 'Write a Python function to calculate fibonacci numbers',
            'expected_type': 'coding'
        },
        {
            'name': 'Analysis task',
            'prompt': 'Analyze the performance metrics and provide recommendations',
            'expected_type': 'analysis'
        },
        {
            'name': 'Creative writing',
            'prompt': 'Write a short story about a robot learning to paint',
            'expected_type': 'creative'
        },
        {
            'name': 'Summarization',
            'prompt': 'Summarize the key points from this meeting transcript',
            'expected_type': 'summarization'
        },
        {
            'name': 'Math problem',
            'prompt': 'Solve this equation: 2x^2 + 5x - 3 = 0',
            'expected_type': 'reasoning'
        },
        {
            'name': 'Privacy-sensitive',
            'prompt': 'Here is my password: secret123, how do I secure it?',
            'expected_type': 'chat',
            'check_privacy': True
        },
        {
            'name': 'Urgent request',
            'prompt': 'URGENT: Quick fix needed for production bug immediately!',
            'expected_type': 'chat',
            'check_urgency': True
        }
    ]
    
    engine = RoutingEngine()
    passed = 0
    failed = 0
    
    for test in test_cases:
        print(f"Testing: {test['name']}")
        print(f"  Prompt: {test['prompt'][:60]}...")
        
        try:
            decision = engine.route(test['prompt'])
            
            checks = []
            
            # Check task type
            if decision.task_profile.task_type.value == test['expected_type']:
                checks.append("✓ type")
            else:
                checks.append(f"✗ type (got {decision.task_profile.task_type.value})")
            
            # Check privacy
            if test.get('check_privacy'):
                if decision.task_profile.privacy_sensitive:
                    checks.append("✓ privacy")
                    if 'local' in decision.selected_provider:
                        checks.append("✓ privacy routing")
                else:
                    checks.append("✗ privacy not detected")
            
            # Check urgency
            if test.get('check_urgency'):
                if decision.task_profile.urgency_signals:
                    checks.append("✓ urgency")
                else:
                    checks.append("✗ urgency not detected")
            
            print(f"  Result: {decision.selected_provider}/{decision.selected_model}")
            print(f"  Checks: {' | '.join(checks)}")
            
            if all('✗' not in c for c in checks):
                passed += 1
                print("  ✅ PASSED\n")
            else:
                failed += 1
                print("  ❌ FAILED\n")
                
        except Exception as e:
            failed += 1
            print(f"  ❌ ERROR: {e}\n")
    
    print(f"{'='*60}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*60}\n")
    
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
