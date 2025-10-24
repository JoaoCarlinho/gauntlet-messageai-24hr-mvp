# Pinecone Vector Database Configuration for MessageAI Sales Funnel
# This configuration creates a Pinecone index for storing vector embeddings
# used in the AI agents for semantic search and RAG functionality

# Create Pinecone index for MessageAI production environment
resource "pinecone_index" "messageai_production" {
  name      = "messageai-production"
  dimension = 1536  # OpenAI text-embedding-3-small dimensions
  metric    = "cosine"  # Cosine similarity for semantic search
  
  # Use serverless configuration for cost efficiency
  spec = {
    serverless = {
      cloud  = "aws"
      region = "us-east-1"  # Match AWS region
    }
  }
  
  # Timeout configuration
  timeouts {
    create = "10m"
    delete = "10m"
  }
}

# Note: Collections cannot be created from serverless indexes
# Collections are only available for pod-based indexes
# For serverless indexes, backups are handled automatically by Pinecone
