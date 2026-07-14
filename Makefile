DOCKER ?= docker
TAG ?= latest

# ---- Image names ----
AUTH_IMAGE ?= crpi-a4e25wq5oddt3z3b.cn-shanghai.personal.cr.aliyuncs.com/educlaw/auth-service
FRONTEND_IMAGE ?= crpi-a4e25wq5oddt3z3b.cn-shanghai.personal.cr.aliyuncs.com/educlaw/innospark-auth-frontend

# ---- Registry login ----
REGISTRY_URL       ?= crpi-a4e25wq5oddt3z3b.cn-shanghai.personal.cr.aliyuncs.com
REGISTRY_USER      ?= 13854793771
REGISTRY_PASS      ?= 54educlaw

# ---- Frontend build args (override via environment or `make VAR=val`) ----

.PHONY: \
	login \
	docker-build-auth docker-push-auth \
	docker-build-frontend docker-push-frontend \
	docker-build docker-push

# ============================================================
# Registry login
# ============================================================

## Log into the container registry
login:
	@echo ">>> Logging into registry: $(REGISTRY_URL)"
	$(DOCKER) login $(REGISTRY_URL) -u $(REGISTRY_USER) -p $(REGISTRY_PASS)

# ============================================================
# Backend (auth-backend → Express API on :3000)
# ============================================================

## Build auth-backend image (linux/amd64)
docker-build-auth:
	$(DOCKER) build --platform linux/amd64 \
		-t $(AUTH_IMAGE):$(TAG) \
		-f auth-backend/Dockerfile .

## Push auth-backend image
docker-push-auth:
	$(DOCKER) push $(AUTH_IMAGE):$(TAG)

# ============================================================
# Frontend (auth-frontend → Nginx + SPA on :80)
# ============================================================

FRONTEND_BUILD_ARGS =
ifneq ($(VITE_API_BASE),)
	FRONTEND_BUILD_ARGS += --build-arg VITE_API_BASE=$(VITE_API_BASE)
endif
ifneq ($(VITE_SANDBOX_WORKSPACE_URL_TEMPLATE),)
	FRONTEND_BUILD_ARGS += --build-arg VITE_SANDBOX_WORKSPACE_URL_TEMPLATE=$(VITE_SANDBOX_WORKSPACE_URL_TEMPLATE)
endif

## Build auth-frontend image (linux/amd64)
docker-build-frontend:
	$(DOCKER) build --platform linux/amd64 \
		$(FRONTEND_BUILD_ARGS) \
		-t $(FRONTEND_IMAGE):$(TAG) \
		-f auth-frontend/Dockerfile .

## Push auth-frontend image
docker-push-frontend:
	$(DOCKER) push $(FRONTEND_IMAGE):$(TAG)

# ============================================================
# Convenience: build / push both
# ============================================================

## Build both backend and frontend images
docker-build: docker-build-auth docker-build-frontend

## Push both backend and frontend images
docker-push: docker-push-auth docker-push-frontend
