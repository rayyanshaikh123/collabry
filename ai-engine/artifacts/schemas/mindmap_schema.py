"""
Mindmap Schema - Structural Rules for Mindmap Artifacts.

Defines validation rules for hierarchical mind maps.
"""

from typing import Dict, List, Any, Set


class MindmapSchema:
    """
    Schema for mindmap artifacts.

    Structure:
    {
        "root": {
            "label": str,
            "children": [
                {
                    "label": str,
                    "children": [...]
                }
            ]
        }
    }
    """

    @staticmethod
    def validate(artifact: Dict[str, Any]) -> List[str]:
        """
        Validate mindmap artifact structure.

        Args:
            artifact: Mindmap artifact dictionary

        Returns:
            List of violation messages (empty if valid)
        """
        violations = []

        # Check top-level structure
        if "root" not in artifact:
            violations.append("Missing 'root' field")
            return violations

        if not isinstance(artifact["root"], dict):
            violations.append("'root' must be a dictionary")
            return violations

        # Validate root node
        root = artifact["root"]
        if "label" not in root:
            violations.append("Root node missing 'label' field")
            return violations

        if not isinstance(root["label"], str):
            violations.append("Root label must be a string")
        elif len(root["label"].strip()) == 0:
            violations.append("Root label cannot be empty")

        if "children" not in root:
            violations.append("Root node missing 'children' field")
            return violations

        if not isinstance(root["children"], list):
            violations.append("Root 'children' must be a list")
            return violations

        # Validate tree structure
        all_labels = set()
        path = []
        MindmapSchema._validate_node(root, violations, all_labels, path)

        # Check for cycles
        MindmapSchema._check_cycles(root, violations)

        return violations

    @staticmethod
    def _validate_node(
        node: Dict[str, Any],
        violations: List[str],
        all_labels: Set[str],
        path: List[str]
    ):
        """
        Recursively validate node structure.

        Args:
            node: Current node
            violations: Violation list to append to
            all_labels: Set of all labels (for duplicate detection)
            path: Current path for error reporting
        """
        if not isinstance(node, dict):
            violations.append(f"Node at {'/'.join(path) or 'root'} is not a dictionary")
            return

        # Check label
        if "label" not in node:
            violations.append(f"Node at {'/'.join(path) or 'root'} missing 'label'")
            return

        label = node["label"]
        if not isinstance(label, str):
            violations.append(f"Label at {'/'.join(path) or 'root'} must be a string")
        elif len(label.strip()) == 0:
            violations.append(f"Label at {'/'.join(path) or 'root'} cannot be empty")
        else:
            # Check for duplicate labels
            if label.lower() in all_labels:
                violations.append(f"Duplicate label found: '{label}'")
            else:
                all_labels.add(label.lower())

        # Check children
        if "children" not in node:
            violations.append(f"Node '{label}' missing 'children' field")
            return

        if not isinstance(node["children"], list):
            violations.append(f"Node '{label}' children must be a list")
            return

        # Validate children recursively
        for i, child in enumerate(node["children"]):
            child_path = path + [f"{label}[{i}]"]
            MindmapSchema._validate_node(child, violations, all_labels, child_path)

    @staticmethod
    def _check_cycles(root: Dict[str, Any], violations: List[str]):
        """
        Check for cycles in the tree.

        Args:
            root: Root node
            violations: Violation list to append to
        """
        visited = set()

        def dfs(node: Dict[str, Any], ancestors: Set[str]):
            if not isinstance(node, dict) or "label" not in node:
                return

            label = node.get("label", "")
            if not isinstance(label, str):
                return

            label_lower = label.lower()

            # Cycle detected
            if label_lower in ancestors:
                violations.append(f"Cycle detected: node '{label}' appears in its own ancestry")
                return

            # Mark as visited
            if label_lower in visited:
                return

            visited.add(label_lower)
            ancestors.add(label_lower)

            # Visit children
            children = node.get("children", [])
            if isinstance(children, list):
                for child in children:
                    dfs(child, ancestors.copy())

        dfs(root, set())

    @staticmethod
    def get_repair_instructions() -> str:
        """
        Get instructions for LLM to repair mindmap artifacts.

        Returns:
            Repair instructions string
        """
        return """Repair this mindmap artifact to fix the following violations:

Rules:
1. Must have single root node with 'label' and 'children' fields
2. Each node must have 'label' (non-empty string) and 'children' (list)
3. No duplicate labels allowed
4. No cycles allowed (node cannot appear in its own ancestry)
5. All nodes must be connected to root (no orphans)
6. Labels must be from the provided content

Return the corrected mindmap in the same JSON format."""
