#!/bin/bash
# D1 Database Setup Script for EduSaaS
# Run this script to initialize Cloudflare D1 database

set -e

echo "=== EduSaaS D1 Database Setup ==="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI is not installed."
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "Checking Cloudflare authentication..."
wrangler whoami || {
    echo "Please login to Cloudflare:"
    wrangler login
}

# Create D1 database
echo ""
echo "Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create edusaas-db 2>&1 || true)

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+' || echo "")

if [ -z "$DB_ID" ]; then
    # Database might already exist, try to get ID
    echo "Database might already exist. Checking..."
    DB_ID=$(wrangler d1 list | grep edusaas-db | awk '{print $1}' || echo "")
fi

if [ -z "$DB_ID" ]; then
    echo "Error: Could not get database ID. Please create manually:"
    echo "  wrangler d1 create edusaas-db"
    exit 1
fi

echo "Database ID: $DB_ID"

# Update wrangler.toml with the database ID
echo ""
echo "Updating wrangler.toml..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml
else
    sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml
fi

# Create schema
echo ""
echo "Creating database schema..."
wrangler d1 execute edusaas-db --remote --file=./d1-schema.sql

# Seed initial data
echo ""
echo "Seeding initial data..."
wrangler d1 execute edusaas-db --remote --file=./d1-seed.sql

# Check if we should migrate existing data
echo ""
read -p "Do you want to migrate existing data from Turso? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migration script..."
    npx ts-node scripts/migrate-to-d1.ts
    
    if [ -f "./d1-data.sql" ]; then
        echo "Importing data to D1..."
        wrangler d1 execute edusaas-db --remote --file=./d1-data.sql
    fi
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Your D1 database is ready!"
echo "Database ID: $DB_ID"
echo ""
echo "Next steps:"
echo "1. Deploy your application: npm run deploy"
echo "2. Test login with: admin@edusaas.ma / Santafee@@@@@1972"
echo ""
