SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

CLUSTER ?= confy
NS      ?= confy
TAG     ?= $(shell git rev-parse --short HEAD)
APPS    := api worker web
# Only these .env keys go into the k8s Secret (everything else is ConfigMap).
SECRET_KEYS := ELASTICSEARCH_URL|ELASTICSEARCH_API_KEY|OPENAI_API_KEY|OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_HEADERS

render = kubectl kustomize $(1) | sed "s/IMAGE_TAG/$(TAG)/g"

.PHONY: help cluster secrets images kind-load deploy up break-worker fix-worker status port-forward logs-% destroy

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
	for app in $(APPS); do docker build -f apps/$$app/Dockerfile -t confy-$$app:$(TAG) . ; done

kind-load: ## Load images into the kind cluster
	for app in $(APPS); do kind load docker-image confy-$$app:$(TAG) --name $(CLUSTER) ; done

deploy: images kind-load ## Build, load, and apply the base manifests
	$(call render,deploy/k8s/base) | kubectl apply -f -
	kubectl -n $(NS) rollout status deploy/api deploy/web --timeout=120s

up: cluster secrets deploy ## Everything from zero

break-worker: ## DEMO: starve the worker of memory (OOMKilled)
	$(call render,deploy/k8s/overlays/chaos) | kubectl apply -f -

fix-worker: ## DEMO: restore the worker's healthy resources
	$(call render,deploy/k8s/base) | kubectl apply -f -
	kubectl -n $(NS) rollout status deploy/worker --timeout=120s

status: ## Pods in the confy namespace
	kubectl -n $(NS) get pods -o wide

port-forward: ## Open the web app at http://localhost:3000
	kubectl -n $(NS) port-forward svc/web 3000:3000

logs-%: ## Tail logs, e.g. make logs-worker
	kubectl -n $(NS) logs -f deploy/$* --all-containers

destroy: ## Delete the kind cluster
	kind delete cluster --name $(CLUSTER)
