# Makefile for ExcaliWeb Docker Operations
# ==========================================

# Variables
IMAGE_NAME := excaliweb
CONTAINER_NAME := excaliweb-app
PORT := 5174
DOCKER_TAG := latest
DATA_DIR ?= $(shell pwd)/data

.PHONY: help build deploy logs clean status

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "ExcaliWeb Docker Commands"
	@echo "========================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make build   - Build the Docker image"
	@echo "  make deploy  - Rebuild and run container"
	@echo "  make status  - Check container status"
	@echo "  make logs    - View container logs"
	@echo "  make clean   - Stop and remove container"
	@echo ""

build: ## Build the Docker image
	@echo "🔨 Building Docker image: $(IMAGE_NAME):$(DOCKER_TAG)"
	@docker build -f docker/Dockerfile -t $(IMAGE_NAME):$(DOCKER_TAG) .
	@echo "✅ Image built successfully!"
	@echo ""
	@echo "Image details:"
	@docker images $(IMAGE_NAME):$(DOCKER_TAG)

deploy: ## Rebuild and run container (stop existing if running)
	@echo "🚀 Deploying ExcaliWeb..."
	@echo ""
	@echo "Step 1: Stopping existing container (if any)..."
	@docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(CONTAINER_NAME) 2>/dev/null || true
	@echo ""
	@echo "Step 2: Creating data directory (if not exists)..."
	@mkdir -p $(DATA_DIR)
	@echo ""
	@echo "Step 3: Building new image..."
	@docker build -f docker/Dockerfile -t $(IMAGE_NAME):$(DOCKER_TAG) .
	@echo ""
	@echo "Step 4: Starting new container..."
	@docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):80 \
		-v $(DATA_DIR):/app/data \
		-e DATA_DIR=/app/data \
		-e DEFAULT_WORKSPACE=true \
		-e PUID=$(shell id -u) \
		-e PGID=$(shell id -g) \
		--restart unless-stopped \
		$(IMAGE_NAME):$(DOCKER_TAG)
	@echo ""
	@echo "✅ Deployment complete!"
	@echo ""
	@echo "📍 Application running at: http://localhost:$(PORT)"
	@echo "📂 Data directory: $(DATA_DIR)"
	@echo "🔍 Container name: $(CONTAINER_NAME)"
	@echo ""
	@echo "Run 'make status' to check container status"
	@echo "Run 'make logs' to view container logs"

logs: ## View container logs (follow mode)
	@echo "📋 Showing logs for $(CONTAINER_NAME)..."
	@echo "   (Press Ctrl+C to stop following)"
	@echo ""
	@docker logs -f $(CONTAINER_NAME)

status: ## Check container status and health
	@echo "📊 Container Status"
	@echo "==================="
	@echo ""
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(CONTAINER_NAME)$$"; then \
		echo "Container: $(CONTAINER_NAME)"; \
		echo ""; \
		docker ps -a --filter "name=$(CONTAINER_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"; \
		echo ""; \
		if docker ps --format '{{.Names}}' | grep -q "^$(CONTAINER_NAME)$$"; then \
			echo "🟢 Status: Running"; \
			echo ""; \
			echo "Health Check:"; \
			docker inspect --format='{{.State.Health.Status}}' $(CONTAINER_NAME) 2>/dev/null || echo "No health check configured"; \
			echo ""; \
			echo "📍 Access: http://localhost:$(PORT)"; \
		else \
			echo "🔴 Status: Stopped"; \
		fi; \
	else \
		echo "⚠️  Container '$(CONTAINER_NAME)' not found"; \
		echo ""; \
		echo "Run 'make deploy' to create and start the container"; \
	fi
	@echo ""

clean: ## Stop container and clean up all resources
	@echo "🧹 Cleaning up ExcaliWeb resources..."
	@echo ""
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(CONTAINER_NAME)$$"; then \
		echo "Stopping container..."; \
		docker stop $(CONTAINER_NAME) 2>/dev/null || true; \
		echo "Removing container..."; \
		docker rm $(CONTAINER_NAME) 2>/dev/null || true; \
	else \
		echo "Container '$(CONTAINER_NAME)' not found (already cleaned)"; \
	fi
	@echo ""
	@if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^$(IMAGE_NAME):$(DOCKER_TAG)$$"; then \
		echo "Removing image..."; \
		docker rmi $(IMAGE_NAME):$(DOCKER_TAG) 2>/dev/null || true; \
	else \
		echo "Image '$(IMAGE_NAME):$(DOCKER_TAG)' not found (already cleaned)"; \
	fi
	@echo ""
	@echo "Cleaning up dangling images and build cache..."
	@docker image prune -f
	@echo ""
	@echo "✅ Cleanup complete!"
	@echo ""
