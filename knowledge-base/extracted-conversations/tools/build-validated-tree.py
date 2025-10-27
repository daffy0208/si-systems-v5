#!/usr/bin/env python3
"""
Build Validated Tree - Option 1 Approach

Builds folder structure starting from high-confidence tiers (≥70%)
and fills in foundation from most authoritative conversations.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Set

def load_validated_structure(json_path: str) -> Dict:
    """Load validated structure data"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_comparison_data(json_path: str) -> Dict:
    """Load comparison data"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_high_confidence_tiers(validated: Dict, threshold: float = 0.7) -> List[Dict]:
    """Get tiers with confidence >= threshold"""
    return [t for t in validated['tiers'] if t['confidence'] >= threshold]

def get_most_complete_conversations(matrix: Dict, min_tiers: int = 25) -> List[Dict]:
    """Get conversations with most complete structures"""
    complete = [s for s in matrix['structures'] if len(s['tiers']) >= min_tiers]
    complete.sort(key=lambda s: len(s['tiers']), reverse=True)
    return complete

def extract_tier_details(tier_num: str, conversation: Dict) -> Dict:
    """Extract complete tier details from a conversation"""
    tier_data = conversation['tiers'].get(tier_num, {})

    return {
        'tierNumber': tier_num,
        'tierName': tier_data.get('tierName', f'{tier_num}_Unknown'),
        'subfolders': tier_data.get('subfolders', []),
        'files': tier_data.get('files', []),
        'depth': tier_data.get('depth', 0),
        'comments': tier_data.get('comments', ''),
        'source': Path(conversation['conversationFile']).name
    }

def build_foundation_tiers(validated: Dict, matrix: Dict) -> List[Dict]:
    """Build foundation tiers (00-04) from most authoritative sources"""
    print("\n🏗️  Building foundation tiers (00-04)...\n")

    # Get most complete conversations
    complete_convs = get_most_complete_conversations(matrix, min_tiers=25)

    if not complete_convs:
        print("  ⚠️  No conversations with 25+ tiers found")
        return []

    print(f"  Found {len(complete_convs)} complete conversations")
    print(f"  Using: {Path(complete_convs[0]['conversationFile']).name}")
    print(f"  ({len(complete_convs[0]['tiers'])} tiers, {complete_convs[0]['metadata']['deepestLevel']} levels deep)\n")

    # Use the most complete conversation for foundation
    primary_source = complete_convs[0]

    foundation_tiers = []

    # Determine tier numbering system (0 vs 00)
    has_00 = '00' in primary_source['tiers']
    has_0 = '0' in primary_source['tiers']

    if has_00:
        tier_nums = ['00', '01', '02', '03', '04']
        print("  Using 00-04 tier numbering system")
    else:
        tier_nums = ['0', '1', '2', '3', '4']
        print("  Using 0-4 tier numbering system")

    for tier_num in tier_nums:
        if tier_num in primary_source['tiers']:
            tier = extract_tier_details(tier_num, primary_source)

            # Get validation confidence for this tier
            validated_tier = next((t for t in validated['tiers'] if t['tierNumber'] == tier_num), None)
            if validated_tier:
                tier['confidence'] = validated_tier['confidence']
            else:
                tier['confidence'] = 0.5  # Default for missing

            foundation_tiers.append(tier)
            conf_pct = int(tier['confidence'] * 100)
            print(f"  ✓ Tier {tier_num}: {tier['tierName']} [{conf_pct}% confidence]")

    return foundation_tiers

def build_high_confidence_tiers(validated: Dict, matrix: Dict, threshold: float = 0.7) -> List[Dict]:
    """Build high-confidence tiers with complete details"""
    print(f"\n🎯 Building high-confidence tiers (≥{int(threshold*100)}%)...\n")

    high_conf_tiers = get_high_confidence_tiers(validated, threshold)

    # Get most complete conversations for detail extraction
    complete_convs = get_most_complete_conversations(matrix, min_tiers=20)

    detailed_tiers = []

    for tier in high_conf_tiers:
        tier_num = tier['tierNumber']

        # Find best source for this tier (most complete structure that has this tier)
        best_source = None
        max_depth = 0

        for conv in complete_convs:
            if tier_num in conv['tiers']:
                tier_data = conv['tiers'][tier_num]
                depth = tier_data.get('depth', 0)
                if depth > max_depth:
                    max_depth = depth
                    best_source = conv

        if best_source:
            detailed_tier = extract_tier_details(tier_num, best_source)
            detailed_tier['confidence'] = tier['confidence']
            detailed_tiers.append(detailed_tier)

            conf_pct = int(tier['confidence'] * 100)
            print(f"  ✓ Tier {tier_num}: {detailed_tier['tierName']} [{conf_pct}% confidence]")

    return detailed_tiers

def build_validated_tree(validated: Dict, matrix: Dict) -> Dict:
    """Build complete validated tree structure"""
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("🌳 Building Validated Folder Tree")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Build foundation (00-04 or 0-4)
    foundation = build_foundation_tiers(validated, matrix)

    # Build high-confidence tiers
    high_confidence = build_high_confidence_tiers(validated, matrix, threshold=0.7)

    # Combine all tiers, remove duplicates
    all_tiers = {}

    for tier in foundation:
        all_tiers[tier['tierNumber']] = tier

    for tier in high_confidence:
        # Don't overwrite foundation if already exists
        if tier['tierNumber'] not in all_tiers:
            all_tiers[tier['tierNumber']] = tier

    # Sort tiers by number
    sorted_tiers = sorted(all_tiers.values(), key=lambda t: int(t['tierNumber']) if t['tierNumber'].isdigit() else int(t['tierNumber'], 10))

    # Calculate coverage
    total_expected = 32  # 0-31 or 00-31
    covered = len(sorted_tiers)
    coverage = (covered / total_expected) * 100

    # Average confidence
    avg_confidence = sum(t['confidence'] for t in sorted_tiers) / len(sorted_tiers) if sorted_tiers else 0

    validated_tree = {
        'rootName': validated['rootName'],
        'version': validated['version'],
        'buildMethod': 'high-confidence-foundation',
        'buildDate': validated.get('validationMetadata', {}).get('analysisDate', ''),
        'coverage': {
            'totalExpectedTiers': total_expected,
            'coveredTiers': covered,
            'coveragePercent': round(coverage, 1),
            'missingTiers': total_expected - covered
        },
        'confidence': {
            'overall': round(avg_confidence, 3),
            'foundationTiers': len(foundation),
            'highConfidenceTiers': len(high_confidence)
        },
        'tiers': sorted_tiers
    }

    return validated_tree

def generate_tree_visualization(tree: Dict) -> str:
    """Generate visual tree structure"""
    lines = []
    lines.append(f"\n{tree['rootName']}/\n")

    for tier in tree['tiers']:
        conf_pct = int(tier['confidence'] * 100)
        conf_icon = "🟢" if tier['confidence'] >= 0.7 else "🟡" if tier['confidence'] >= 0.5 else "🔴"

        lines.append(f"├── {tier['tierNumber'].rjust(2)}_")
        lines.append(f"     {tier['tierName']}/")
        lines.append(f"     {conf_icon} {conf_pct}% confidence")

        if tier.get('comments'):
            lines.append(f"     # {tier['comments']}")

        # Show some subfolders if available
        if tier.get('subfolders'):
            subfolder_count = len(tier['subfolders'])
            sample = tier['subfolders'][:3]
            for sf in sample:
                lines.append(f"│    ├── {sf}/")
            if subfolder_count > 3:
                lines.append(f"│    └── ... and {subfolder_count - 3} more")

        # Show some files if available
        if tier.get('files'):
            file_count = len(tier['files'])
            sample = tier['files'][:2]
            for f in sample:
                lines.append(f"│    ├── {f}")
            if file_count > 2:
                lines.append(f"│    └── ... and {file_count - 2} more")

        lines.append("")

    return "\n".join(lines)

def generate_report(tree: Dict, output_path: str):
    """Generate markdown report"""
    report = []
    report.append("# Validated Folder Tree - Option 1 Build\n\n")
    report.append(f"**Root**: {tree['rootName']}\n")
    report.append(f"**Version**: {tree['version']}\n")
    report.append(f"**Build Method**: Start from high-confidence tiers, fill foundation\n")
    report.append(f"**Build Date**: {tree['buildDate']}\n\n")

    report.append("---\n\n")
    report.append("## Coverage\n\n")
    report.append(f"- **Expected Tiers**: {tree['coverage']['totalExpectedTiers']}\n")
    report.append(f"- **Covered Tiers**: {tree['coverage']['coveredTiers']}\n")
    report.append(f"- **Coverage**: {tree['coverage']['coveragePercent']}%\n")
    report.append(f"- **Missing Tiers**: {tree['coverage']['missingTiers']}\n\n")

    report.append("---\n\n")
    report.append("## Confidence\n\n")
    report.append(f"- **Overall Confidence**: {int(tree['confidence']['overall'] * 100)}%\n")
    report.append(f"- **Foundation Tiers (00-04)**: {tree['confidence']['foundationTiers']}\n")
    report.append(f"- **High-Confidence Tiers (≥70%)**: {tree['confidence']['highConfidenceTiers']}\n\n")

    report.append("---\n\n")
    report.append("## Validated Tier Structure\n\n")
    report.append("| Tier | Name | Confidence | Subfolders | Files | Source |\n")
    report.append("|------|------|------------|-----------|-------|--------|\n")

    for tier in tree['tiers']:
        conf_pct = int(tier['confidence'] * 100)
        conf_icon = "🟢" if tier['confidence'] >= 0.7 else "🟡" if tier['confidence'] >= 0.5 else "🔴"
        subfolder_count = len(tier.get('subfolders', []))
        file_count = len(tier.get('files', []))
        source = tier.get('source', 'N/A')

        report.append(f"| **{tier['tierNumber']}** | {tier['tierName']} | {conf_icon} {conf_pct}% | {subfolder_count} | {file_count} | {source} |\n")

    report.append("\n---\n\n")
    report.append("## Visual Tree Structure\n\n")
    report.append("```\n")
    report.append(generate_tree_visualization(tree))
    report.append("```\n")

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(''.join(report))

def main():
    if len(sys.argv) < 4:
        print("Usage: python build-validated-tree.py <validated-json> <comparison-json> <output-json>")
        sys.exit(1)

    validated_json = sys.argv[1]
    comparison_json = sys.argv[2]
    output_json = sys.argv[3]

    # Load data
    validated = load_validated_structure(validated_json)
    matrix = load_comparison_data(comparison_json)

    # Build tree
    tree = build_validated_tree(validated, matrix)

    # Save JSON
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(tree, f, indent=2)
    print(f"\n✅ Validated tree saved: {output_json}")

    # Generate report
    report_path = output_json.replace('.json', '-report.md')
    generate_report(tree, report_path)
    print(f"✅ Tree report saved: {report_path}\n")

    # Summary
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 BUILD SUMMARY")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    print(f"Coverage: {tree['coverage']['coveragePercent']}% ({tree['coverage']['coveredTiers']}/{tree['coverage']['totalExpectedTiers']} tiers)")
    print(f"Confidence: {int(tree['confidence']['overall'] * 100)}%")
    print(f"Foundation Tiers: {tree['confidence']['foundationTiers']}")
    print(f"High-Confidence Tiers: {tree['confidence']['highConfidenceTiers']}")
    print(f"\nNext: Review {report_path} for validated tree\n")

if __name__ == '__main__':
    main()
