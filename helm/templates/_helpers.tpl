{{/* Release-scoped base name, truncated to the 63 characters a label allows.
     A release already named after the chart is not repeated: `helm install
     journal` gives journal-web, not journal-journal-web. */}}
{{- define "journal.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "journal.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{/* A strict subset of the above, with version left out: a Deployment selector
     is immutable, so a label that changes per release breaks every upgrade. */}}
{{- define "journal.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* The secrets the chart reads and never writes. They exist before the release
     does: a credential passed as a value lands in `helm get values`, in the
     release object in the cluster, and in whatever shell history put it there. */}}
{{- define "journal.postgresSecretName" -}}
{{- required "postgres.existingSecret must name a Secret holding the database username and password" .Values.postgres.existingSecret -}}
{{- end -}}

{{- define "journal.platformSecretName" -}}
{{- required "platform.existingSecret must name a Secret holding SECRETS_KEY" .Values.platform.existingSecret -}}
{{- end -}}

{{- define "journal.redisSecretName" -}}
{{- required "redis.existingSecret must name a Secret holding the Redis password" .Values.redis.existingSecret -}}
{{- end -}}

{{/* Redis: the address is values, the password is one key of a Secret, and the
     two are kept apart rather than joined into a URL. A Redis password is
     commonly base64 and a base64 password commonly contains a slash, which ends
     the authority of a URI — so a correct password embedded in one is a
     connection to the wrong place. Unlike the database's DSN, this is our own
     program reading it, so it can take the two halves. */}}
{{- define "journal.redisEnv" -}}
- name: REDIS_URL
  value: redis://{{ required "redis.host must name the Redis server" .Values.redis.host }}:{{ .Values.redis.port }}/{{ .Values.redis.database }}
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "journal.redisSecretName" . }}
      key: {{ .Values.redis.passwordKey }}
{{- end -}}

{{- define "journal.modelSecretName" -}}
{{- required "models.existingSecret must name a Secret holding OPENROUTER_API_KEY and PARALLEL_API_KEY" .Values.models.existingSecret -}}
{{- end -}}

{{/* OpenRouter, which two containers need for different reasons: the agent to
     answer, the sidecar to embed what it remembers. Shared so they cannot come
     from two different Secrets by accident. */}}
{{- define "journal.openrouterEnv" -}}
- name: OPENROUTER_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "journal.modelSecretName" . }}
      key: OPENROUTER_API_KEY
{{- end -}}

{{/* Web search, which only the agent does. */}}
{{- define "journal.parallelEnv" -}}
- name: PARALLEL_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "journal.modelSecretName" . }}
      key: PARALLEL_API_KEY
{{- end -}}

{{- define "journal.authSecretName" -}}
{{- required "auth.existingSecret must name a Secret holding AUTH_SECRET and the AUTH_OIDC_* pair" .Values.auth.existingSecret -}}
{{- end -}}

{{/* The database connection, as environment. The credential is two keys of a
     Secret and the rest is values, so the DSN is assembled by the kubelet and
     never written down. Shared so the agent and the migration cannot drift. */}}
{{- define "journal.postgresEnv" -}}
- name: POSTGRES_USER
  valueFrom:
    secretKeyRef:
      name: {{ include "journal.postgresSecretName" . }}
      key: {{ .Values.postgres.usernameKey }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "journal.postgresSecretName" . }}
      key: {{ .Values.postgres.passwordKey }}
# Nothing escapes these on the way in, so both halves have to be
# percent-encoded in the Secret if they carry anything with URI meaning —
# : / ? # @ [ ] and % itself.
- name: POSTGRES_DSN
  value: postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@{{ required "postgres.host must name the database server" .Values.postgres.host }}:{{ .Values.postgres.port }}/{{ .Values.postgres.database }}?sslmode={{ .Values.postgres.sslmode }}
{{- end -}}
