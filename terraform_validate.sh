cd iac
terraform init
terraform validate
terraform fmt -check
terraform plan -out tfplan
# terrform apply tfplan