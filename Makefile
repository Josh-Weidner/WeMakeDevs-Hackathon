SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

CLUSTER ?= confy
NS      ?= confy
TAG     ?= $(shell git rev-parse --short HEAD)
# Branch Argo CD tracks. Merged PRs on main are what deploys.
REVISION ?= main
APPS    := api worker web
# BuildKit builder (the Dockerfiles use RUN --mount). Falls back to OrbStack's bundled
# docker-buildx when the docker CLI has no buildx plugin (or docker isn't on PATH).
ORB_XBIN := /Applications/OrbStack.app/Contents/MacOS/xbin
BUILDX ?= $(shell if docker buildx version >/dev/null 2>&1; then echo "docker buildx"; \
  elif command -v docker-buildx >/dev/null 2>&1; then echo docker-buildx; \
  elif [ -x $(ORB_XBIN)/docker-buildx ]; then echo $(ORB_XBIN)/docker-buildx; \
  else echo "docker buildx"; fi)
# Only these .env keys go into the k8s Secret (everything else is ConfigMap).
SECRET_KEYS := ELASTICSEARCH_URL|ELASTICSEARCH_API_KEY|OPENAI_API_KEY|OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_HEADERS|DASH0_RUM_ENDPOINT|DASH0_RUM_TOKEN

render = kubectl kustomize $(1) | sed "s/IMAGE_TAG/$(TAG)/g"

.PHONY: help cluster secrets images kind-load deploy argocd release up break-worker fix-worker status port-forward logs-% destroy

help: ## List targets
	@grep -E '^[a-zA-Z_%-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-16s %s\n",$$1,$$2}'

cluster: ## Create the local kind cluster + namespace
	@kind get clusters | grep -qx $(CLUSTER) || kind create cluster --config deploy/kind/kind-config.yaml
	kubectl apply -f deploy/k8s/base/namespace.yaml

secrets: ## Create/update the confy-secrets Secret from .env (never committed)
	@test -f .env || { echo "Missing .env: cp .env.example .env and fill it in"; exit 1; }
	kubectl -n $(NS) create secret generic confy-secrets \
  --from-env-file=<(grep -E '^($(SECRET_KEYS))=' .env) \
  --dry-run=client -o yaml | kubectl apply -f -

images: ## Build all images tagged with the git SHA
	for app in $(APPS); do $(BUILDX) build --load -f apps/$$app/Dockerfile -t confy-$$app:$(TAG) . ; done

kind-load: ## Load images into the kind cluster
	for app in $(APPS); do kind load docker-image confy-$$app:$(TAG) --name $(CLUSTER) ; done

deploy: images kind-load ## Without Argo CD only: build, load, and kubectl-apply the base manifests
	$(call render,deploy/k8s/base) | kubectl apply -f -
	kubectl -n $(NS) rollout status deploy/api deploy/web --timeout=120s

argocd: ## Point Argo CD at this repo (tracks REVISION, runs images tagged TAG)
	sed -e "s/IMAGE_TAG/$(TAG)/g" -e "s|TARGET_REVISION|$(REVISION)|g" deploy/argocd/confy.yaml | kubectl apply -f -

release: ## Build images for origin/main and roll them out through Argo CD (run on a clean main)
	@git fetch -q origin main
	@test "$$(git rev-parse HEAD)" = "$$(git rev-parse origin/main)" || { echo "release: check out main at origin/main first"; exit 1; }
	@test -z "$$(git status --porcelain)" || { echo "release: working tree is dirty"; exit 1; }
	$(MAKE) images argocd REVISION=main TAG=$(TAG)
	@# Argo CD applies the new tag asynchronously. Wait until every Deployment's spec has it,
	@# or `rollout status` would just report the previous, already-finished rollout.
	@echo "release: waiting for Argo CD to apply $(TAG)..."; \
	for i in $$(seq 1 60); do \
	  imgs=$$(kubectl -n $(NS) get deploy $(APPS) -o jsonpath='{.items[*].spec.template.spec.containers[0].image}' 2>/dev/null); \
	  ok=0; stale=; for img in $$imgs; do case "$$img" in *:$(TAG)) ok=$$((ok+1));; *) stale="$$stale $$img";; esac; done; \
	  [ "$$ok" -eq $(words $(APPS)) ] && exit 0; sleep 2; \
	done; echo "release: Argo CD did not apply $(TAG) within 120s (still:$$stale)"; exit 1
	kubectl -n $(NS) rollout status $(addprefix deploy/,$(APPS)) --timeout=180s

up: cluster secrets deploy ## Everything from zero

break-worker: ## DEMO: OOMKill the worker (patches only the live worker; Argo CD shows OutOfSync)
	kubectl -n $(NS) patch deployment worker --type strategic --patch-file deploy/k8s/overlays/chaos/worker-oom.yaml

fix-worker: ## DEMO fallback: Argo CD sync back to git (the real fix is merging the fix PR)
	kubectl -n argocd patch application confy --type merge \
  -p '{"operation":{"initiatedBy":{"username":"make fix-worker"},"sync":{"prune":true}}}'
	kubectl -n $(NS) rollout status deploy/worker --timeout=180s

status: ## Pods in the confy namespace
	kubectl -n $(NS) get pods -o wide

port-forward: ## Open the web app at http://localhost:3000
	kubectl -n $(NS) port-forward svc/web 3000:3000

logs-%: ## Tail logs, e.g. make logs-worker
	kubectl -n $(NS) logs -f deploy/$* --all-containers

destroy: ## Delete the kind cluster
	kind delete cluster --name $(CLUSTER)
