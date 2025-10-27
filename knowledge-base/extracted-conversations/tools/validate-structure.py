#!/usr/bin/env python3
"""
Validate Folder Structure - Determine Ground Truth

Analyzes all folder structure variations to determine validated structure.
"""

import json
import sys
from pathlib import Path
from collections import Counter
from typing import Dict, List, Set

def load_comparison(json_path: str) -> Dict:
    """Load comparison JSON data"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def calculate_confidence(tier_num: str, tier_name: str, matrix: Dict) -> float:
    """Calculate confidence score for a tier name"""
    # Get all sources for this tier
    occurrences = matrix['tierOccurrences'].get(tier_num, [])
    if not occurrences:
        return 0.0

    # Count how many use this exact name
    count = 0
    total_depth = 0
    for structure in matrix['structures']:
        tier_data = structure['tiers'].get(tier_num)
        if tier_data and tier_data['tierName'] == tier_name:
            count += 1
            total_depth += structure['metadata'].get('deepestLevel', 0)

    if count == 0:
        return 0.0

    # Frequency score (40%)
    frequency = count / len(occurrences)

    # Completeness score (40%) - based on structure depth
    avg_depth = total_depth / count
    completeness = min(avg_depth / 5.0, 1.0)  # Normalize to 5 levels

    # Consensus score (20%) - if appears in complete structures
    complete_structures = [s for s in matrix['structures'] if len(s['tiers']) >= 20]
    in_complete = sum(1 for s in complete_structures if s['tiers'].get(tier_num, {}).get('tierName') == tier_name)
    consensus = in_complete / max(len(complete_structures), 1) if complete_structures else 0.5

    # Weighted score
    confidence = (frequency * 0.4) + (completeness * 0.4) + (consensus * 0.2)

    return confidence

def validate_structure(matrix: Dict) -> Dict:
    """Build validated structure with confidence scores"""
    print("\\n🔍 Analyzing folder structure patterns...\\n")

    # Get all unique tiers
    all_tiers = sorted(set(matrix['allTiers']), key=lambda x: int(x) if x.isdigit() else 999)

    validated_tiers = []

    for tier_num in all_tiers:
        # Get all name variations
        variations = matrix['tierVariations'].get(tier_num, [])
        if not variations:
            continue

        # Calculate confidence for each variation
        scores = []
        for name in variations:
            conf = calculate_confidence(tier_num, name, matrix)
            scores.append((name, conf))

        # Sort by confidence
        scores.sort(key=lambda x: x[1], reverse=True)

        # Pick the highest confidence name
        canonical_name, confidence = scores[0]
        alternatives = [name for name, _ in scores[1:]]

        # Get sources
        sources = matrix['tierOccurrences'].get(tier_num, [])
        source_count = len(sources)

        tier = {
            'tierNumber': tier_num,
            'canonicalName': canonical_name,
            'alternativeNames': alternatives,
            'confidence': round(confidence, 3),
            'sourceCount': source_count
        }

        validated_tiers.append(tier)

        # Print progress
        conf_pct = int(confidence * 100)
        alt_text = f" ({len(alternatives)} alternatives)" if alternatives else ""
        print(f"  Tier {tier_num.rjust(2)}: {canonical_name}{alt_text} [{conf_pct}% confidence, {source_count} sources]")

    # Determine root name
    root_names = Counter()
    for structure in matrix['structures']:
        if structure.get('rootFolder'):
            root_names[structure['rootFolder']] += 1

    most_common_root = root_names.most_common(1)[0][0] if root_names else 'Sapien_Intelligence_v4.0'

    # Extract version
    import re
    version_match = re.search(r'v(\\d+\\.\\d+(?:\\.\\d+)?)', most_common_root)
    version = version_match.group(1) if version_match else '4.0'

    # Overall confidence
    avg_confidence = sum(t['confidence'] for t in validated_tiers) / len(validated_tiers) if validated_tiers else 0

    print(f"\\n  Root: {most_common_root} (v{version})")
    print(f"  Overall Confidence: {int(avg_confidence * 100)}%\\n")

    return {
        'rootName': most_common_root,
        'version': version,
        'overallConfidence': round(avg_confidence, 3),
        'totalTiers': len(validated_tiers),
        'totalSources': len(matrix['structures']),
        'tiers': validated_tiers
    }

def generate_report(validated: Dict, output_path: str):
    """Generate markdown report"""
    report = []
    report.append("# Validated Folder Structure Report\\n")
    report.append(f"**Root**: {validated['rootName']}\\n")
    report.append(f"**Version**: {validated['version']}\\n")
    report.append(f"**Overall Confidence**: {int(validated['overallConfidence'] * 100)}%\\n")
    report.append(f"**Total Tiers**: {validated['totalTiers']}\\n")
    report.append(f"**Source Conversations**: {validated['totalSources']}\\n\\n")

    report.append("---\\n\\n")
    report.append("## Validated Tier Structure\\n\\n")
    report.append("| Tier | Canonical Name | Confidence | Alternatives | Sources |\\n")
    report.append("|------|----------------|------------|--------------|---------|\\n")

    for tier in validated['tiers']:
        conf_pct = int(tier['confidence'] * 100)
        alt_count = len(tier['alternativeNames'])
        alt_text = f"{alt_count} variations" if alt_count > 0 else "None"

        report.append(f"| **{tier['tierNumber']}** | {tier['canonicalName']} | {conf_pct}% | {alt_text} | {tier['sourceCount']} |\\n")

    report.append("\\n---\\n\\n")
    report.append("## High Confidence Tiers (≥70%)\\n\\n")

    high_conf = [t for t in validated['tiers'] if t['confidence'] >= 0.7]
    if high_conf:
        for tier in high_conf:
            report.append(f"### Tier {tier['tierNumber']}: {tier['canonicalName']}\\n\\n")
            report.append(f"**Confidence**: {int(tier['confidence'] * 100)}%\\n")
            report.append(f"**Sources**: {tier['sourceCount']} conversations\\n")
            if tier['alternativeNames']:
                report.append(f"**Alternatives**: {', '.join(tier['alternativeNames'][:3])}\\n")
            report.append("\\n")
    else:
        report.append("No tiers with ≥70% confidence.\\n")

    report.append("\\n---\\n\\n")
    report.append("## Low Confidence Tiers (<50%)\\n\\n")

    low_conf = [t for t in validated['tiers'] if t['confidence'] < 0.5]
    if low_conf:
        report.append("⚠️ The following tiers need manual validation:\\n\\n")
        for tier in low_conf:
            report.append(f"- **Tier {tier['tierNumber']}**: {tier['canonicalName']} ({int(tier['confidence'] * 100)}% confidence, {tier['sourceCount']} sources)\\n")
    else:
        report.append("✅ All tiers have at least 50% confidence.\\n")

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(''.join(report))

def main():
    if len(sys.argv) < 3:
        print("Usage: python validate-structure.py <comparison-json> <output-json>")
        sys.exit(1)

    comparison_json = sys.argv[1]
    output_json = sys.argv[2]

    print("\\n🔬 Folder Structure Validation Analysis")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n")

    # Load data
    print(f"📂 Loading: {comparison_json}")
    matrix = load_comparison(comparison_json)

    # Validate
    validated = validate_structure(matrix)

    # Save JSON
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(validated, f, indent=2)
    print(f"✅ Validated structure saved: {output_json}")

    # Generate report
    report_path = output_json.replace('.json', '-report.md')
    generate_report(validated, report_path)
    print(f"✅ Validation report saved: {report_path}\\n")

    # Summary
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 VALIDATION SUMMARY")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n")

    high = sum(1 for t in validated['tiers'] if t['confidence'] >= 0.7)
    med = sum(1 for t in validated['tiers'] if 0.5 <= t['confidence'] < 0.7)
    low = sum(1 for t in validated['tiers'] if t['confidence'] < 0.5)

    print(f"Total Tiers: {validated['totalTiers']}")
    print(f"High Confidence (≥70%): {high}")
    print(f"Medium Confidence (50-70%): {med}")
    print(f"Low Confidence (<50%): {low}")
    print(f"\\nOverall Confidence: {int(validated['overallConfidence'] * 100)}%")
    print(f"\\nNext: Review {report_path}\\n")

if __name__ == '__main__':
    main()
