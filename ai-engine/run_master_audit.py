"""
Master AI Systems Reliability Audit Runner

Executes comprehensive reliability testing across three dimensions:
1. Architectural failure modes (state, logic, boundaries)
2. Code-specific vulnerabilities (implementation flaws)  
3. Conversational behavior failures (user interaction patterns)

Generates consolidated security/reliability report for production assessment.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any

# Import all test suites
from test_rag_fallback import ReliabilityAuditor
from test_specific_vulnerabilities import SpecificVulnerabilityTests
from test_conversation_reliability import ConversationalReliabilityTester

class MasterReliabilityAuditor:
    """Comprehensive reliability audit orchestrator."""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.architectural_auditor = ReliabilityAuditor()
        self.vulnerability_tester = SpecificVulnerabilityTests() 
        self.conversation_tester = ConversationalReliabilityTester()
        
        # Consolidated results
        self.all_findings = []
        self.execution_summary = {}

    def consolidate_results(self):
        """Consolidate results from all test suites."""
        
        # Architectural failures
        for failure in self.architectural_auditor.test_results:
            self.all_findings.append({
                "category": "ARCHITECTURAL",
                "type": "Logic/State Failure",
                "scenario": failure["scenario"],
                "why": failure["why"], 
                "consequence": failure["consequence"],
                "severity": failure["severity"],
                "fix": failure["minimal_fix"],
                "timestamp": failure["timestamp"]
            })
            
        # Code vulnerabilities
        for vuln in self.vulnerability_tester.vulnerabilities_found:
            self.all_findings.append({
                "category": "CODE_VULNERABILITY", 
                "type": "Implementation Flaw",
                "scenario": vuln["test"],
                "why": vuln["code_location"],
                "consequence": vuln["description"],
                "severity": vuln["severity"],
                "fix": "See code location for specific fix",
                "timestamp": datetime.now().isoformat()
            })
            
        # Conversation failures
        for failure in self.conversation_tester.conversation_failures:
            self.all_findings.append({
                "category": "BEHAVIORAL",
                "type": "Conversation Flow Issue", 
                "scenario": " → ".join(failure["conversation_flow"][:3]) + "...",
                "why": failure["failure_description"],
                "consequence": failure["actual_behavior"][:200] + "...",
                "severity": failure["severity"],
                "fix": f"Expected: {failure['expected_behavior']}",
                "timestamp": failure["timestamp"]
            })

    def generate_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary for stakeholders."""
        
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        category_counts = {"ARCHITECTURAL": 0, "CODE_VULNERABILITY": 0, "BEHAVIORAL": 0}
        
        for finding in self.all_findings:
            severity_counts[finding["severity"]] += 1
            category_counts[finding["category"]] += 1
            
        execution_time = (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0
        
        return {
            "audit_timestamp": datetime.now().isoformat(),
            "execution_time_seconds": round(execution_time, 2),
            "total_findings": len(self.all_findings),
            "severity_breakdown": severity_counts,
            "category_breakdown": category_counts,
            "critical_issues": [f for f in self.all_findings if f["severity"] == "CRITICAL"],
            "high_priority_issues": [f for f in self.all_findings if f["severity"] == "HIGH"],
            "risk_assessment": self._assess_overall_risk(severity_counts),
            "recommendations": self._generate_recommendations(severity_counts, category_counts)
        }

    def _assess_overall_risk(self, severity_counts: Dict[str, int]) -> str:
        """Assess overall system risk level."""
        if severity_counts["CRITICAL"] > 0:
            return "HIGH RISK - Critical vulnerabilities require immediate attention"
        elif severity_counts["HIGH"] >= 3:
            return "MODERATE-HIGH RISK - Multiple high-severity issues present"
        elif severity_counts["HIGH"] > 0:
            return "MODERATE RISK - Some high-severity issues require attention"
        elif severity_counts["MEDIUM"] >= 5:
            return "LOW-MODERATE RISK - Multiple medium-severity issues to address"
        elif severity_counts["MEDIUM"] > 0:
            return "LOW RISK - Some medium-severity issues for improvement"
        else:
            return "MINIMAL RISK - Only low-severity issues or no issues found"

    def _generate_recommendations(self, severity_counts: Dict[str, int], category_counts: Dict[str, int]) -> List[str]:
        """Generate prioritized recommendations."""
        recommendations = []
        
        if severity_counts["CRITICAL"] > 0:
            recommendations.append("🚨 IMMEDIATE: Address all CRITICAL vulnerabilities before production deployment")
            
        if severity_counts["HIGH"] > 0:
            recommendations.append("⚠️ HIGH PRIORITY: Fix HIGH severity issues within 1-2 sprints")
            
        if category_counts["CODE_VULNERABILITY"] > category_counts["ARCHITECTURAL"]:
            recommendations.append("🔧 Focus on code-level security hardening and input validation")
        elif category_counts["ARCHITECTURAL"] > 0:
            recommendations.append("🏗️ Review system architecture for state management and isolation")
            
        if category_counts["BEHAVIORAL"] > 0:
            recommendations.append("🗣️ Improve conversation handling and context management")
            
        if severity_counts["MEDIUM"] >= 3:
            recommendations.append("📋 Plan medium-severity fixes for next major release")
            
        recommendations.append("✅ Implement continuous reliability testing in CI/CD pipeline")
        recommendations.append("📊 Schedule quarterly security audits for ongoing assessment")
        
        return recommendations

    def print_detailed_report(self):
        """Print comprehensive audit report."""
        print("\n" + "="*80)
        print("🔍 MASTER AI SYSTEMS RELIABILITY AUDIT REPORT")
        print("="*80)
        
        summary = self.generate_executive_summary()
        
        # Executive Summary
        print(f"\n📊 EXECUTIVE SUMMARY")
        print(f"   Audit Date: {summary['audit_timestamp']}")
        print(f"   Execution Time: {summary['execution_time_seconds']}s")
        print(f"   Total Findings: {summary['total_findings']}")
        print(f"   Risk Assessment: {summary['risk_assessment']}")
        
        # Severity Breakdown
        print(f"\n📈 SEVERITY BREAKDOWN")
        for severity, count in summary['severity_breakdown'].items():
            if count > 0:
                emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}[severity]
                print(f"   {emoji} {severity}: {count}")
                
        # Category Breakdown  
        print(f"\n📋 CATEGORY BREAKDOWN")
        for category, count in summary['category_breakdown'].items():
            if count > 0:
                emoji = {"ARCHITECTURAL": "🏗️", "CODE_VULNERABILITY": "🔧", "BEHAVIORAL": "🗣️"}[category]
                print(f"   {emoji} {category}: {count}")
                
        # Critical Issues (if any)
        if summary['critical_issues']:
            print(f"\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION")
            for i, issue in enumerate(summary['critical_issues'], 1):
                print(f"   {i}. {issue['scenario'][:80]}...")
                print(f"      Consequence: {issue['consequence'][:100]}...")
                print(f"      Fix: {issue['fix'][:100]}...")
                print()
                
        # High Priority Issues
        if summary['high_priority_issues']:
            print(f"\n⚠️ HIGH PRIORITY ISSUES")
            for i, issue in enumerate(summary['high_priority_issues'], 1):
                print(f"   {i}. {issue['scenario'][:80]}...")
                print(f"      Category: {issue['category']} - {issue['type']}")
                print()
                
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS")
        for i, rec in enumerate(summary['recommendations'], 1):
            print(f"   {i}. {rec}")
            
        # Detailed Findings
        if self.all_findings:
            print(f"\n📝 DETAILED FINDINGS BY SEVERITY")
            
            for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                severity_findings = [f for f in self.all_findings if f["severity"] == severity]
                if severity_findings:
                    print(f"\n{severity} SEVERITY ({len(severity_findings)} issues):")
                    for i, finding in enumerate(severity_findings, 1):
                        print(f"   {i}. [{finding['category']}] {finding['scenario'][:70]}...")
                        print(f"      Why: {finding['why'][:100]}...")
                        print(f"      Impact: {finding['consequence'][:100]}...")
                        print(f"      Fix: {finding['fix'][:100]}...")
                        print()

    def export_json_report(self, filename: str = None):
        """Export complete audit results as JSON."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ai_reliability_audit_{timestamp}.json"
            
        report_data = {
            "audit_metadata": self.generate_executive_summary(),
            "detailed_findings": self.all_findings,
            "test_execution": {
                "architectural_tests": len(self.architectural_auditor.test_results),
                "vulnerability_tests": len(self.vulnerability_tester.vulnerabilities_found),
                "behavioral_tests": len(self.conversation_tester.conversation_failures)
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
            
        print(f"📄 Detailed JSON report exported to: {filename}")

    async def run_complete_audit(self):
        """Execute all test suites and generate comprehensive report."""
        
        self.start_time = datetime.now()
        
        print("🚀 Starting Master AI Systems Reliability Audit")
        print("   This comprehensive audit will test:")
        print("   • Architectural failure modes")
        print("   • Code-specific vulnerabilities") 
        print("   • Conversational behavior issues")
        print("\n" + "="*80)
        
        try:
            # Run architectural audit
            print("📐 Running architectural reliability audit...")
            await self.architectural_auditor.run_comprehensive_audit()
            
            print("\n" + "="*80)
            
            # Run vulnerability tests
            print("🔍 Running specific vulnerability tests...")
            await self.vulnerability_tester.run_all_tests()
            
            print("\n" + "="*80)
            
            # Run conversation tests
            print("💬 Running conversational reliability tests...")
            await self.conversation_tester.run_all_conversation_tests()
            
            self.end_time = datetime.now()
            
            # Consolidate and report
            print("\n" + "="*80)
            print("📊 Consolidating results and generating master report...")
            self.consolidate_results()
            self.print_detailed_report()
            self.export_json_report()
            
        except Exception as e:
            print(f"❌ Master audit failed: {e}")
            import traceback
            traceback.print_exc()

async def main():
    """Main entry point for master reliability audit."""
    auditor = MasterReliabilityAuditor()
    await auditor.run_complete_audit()

if __name__ == "__main__":
    print("🔒 AI Systems Reliability Auditor")
    print("   Senior AI Systems Reliability Audit - Production Assessment")
    print("   Comprehensive testing for silent failures, state corruption, and boundary violations")
    print()
    
    asyncio.run(main())