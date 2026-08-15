# Glossaire

Terminologie du domaine Kubernetes utilisée dans le code et l'interface.

| Terme | Définition |
|---|---|
| **Cluster** | Une connexion Kubernetes enregistrée localement (un kubeconfig + un contexte sélectionné). |
| **Kubeconfig** | Fichier YAML contenant les clusters, utilisateurs et contextes ; source d'authentification (tokens, certificats). |
| **Contexte (context)** | Nom dans un kubeconfig associant un cluster + un utilisateur + (optionnel) un namespace. |
| **Namespace** | Isolation logique des ressources au sein d'un cluster. |
| **Workload** | Charge de travail : Deployment, StatefulSet, DaemonSet, Job, CronJob. |
| **Pod** | Plus petite unité déployable, contient un ou plusieurs conteneurs. |
| **Réplicas** | Nombre d'instances souhaitées d'un workload. |
| **Selector** | Labels utilisés pour associer un workload à ses pods. |
| **Service** | Exposition réseau d'un ensemble de pods (ClusterIP, NodePort, LoadBalancer, ExternalName). |
| **Ingress** | Routage HTTP/HTTPS externe vers des Services. |
| **Event** | Événement Kubernetes (Normal/Warning) lié à un objet (raison, message, compteur). |
| **Watch** | Mécanisme Kubernetes de notification des changements (à implémenter, étape 7). |
| **Exec** | Ouverture d'une session shell interactive dans un conteneur (SPDY). |
| **Port-forward** | Redirection d'un port local vers un port d'un pod (SPDY). |
| **Metrics** | Métriques CPU/mémoire via `metrics.k8s.io` (à implémenter, étape 5). |
| **RBAC** | Contrôle d'accès Kubernetes ; peut restreindre l'accès à certains namespaces. |

## Acronymes internes

- **GVR** : Group/Version/Resource (identifiant d'une ressource Kubernetes, utile pour les CRD).
- **CRD** : CustomResourceDefinition (extension de l'API Kubernetes).
- **SPDY** : protocole utilisé par client-go pour exec/port-forward.
- **ADR** : Architecture Decision Record (voir `docs/decisions.md`).
