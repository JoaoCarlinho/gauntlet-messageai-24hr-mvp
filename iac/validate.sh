#!/usr/bin/env bash
set -euo pipefail

# Simple validator for the iac folder
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not found in PATH. Please install Terraform 1.0+"
  exit 2
fi

echo "Initializing Terraform (no backend)"
terraform init -input=false >/dev/null

echo "Validating Terraform configuration"
terraform validate

echo "Formatting Terraform files"
terraform fmt -check

echo "All checks passed"
