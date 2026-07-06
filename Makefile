DOCKER ?= docker
TAG ?= latest
WEB_IMAGE ?= crpi-a4e25wq5oddt3z3b.cn-shanghai.personal.cr.aliyuncs.com/educlaw/eduskill-auth

.PHONY: docker-build-auth docker-push-auth


docker-build-auth:
	$(DOCKER) build --platform linux/amd64 -t $(WEB_IMAGE):$(TAG) -f auth-backend/Dockerfile .

docker-push-auth:
	$(DOCKER) push $(WEB_IMAGE):$(TAG)
